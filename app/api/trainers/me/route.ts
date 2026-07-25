import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

const TEAMS = ["instinct", "mystic", "valor"];
const SPRITE_STYLES = ["static", "animated"];

// Permet à un compte connecté de modifier sa propre équipe/niveau, sans
// passer par PATCH /api/trainers/[id] qui est réservé à l'admin.
export async function PATCH(request: NextRequest) {
  const { trainer } = await getCurrentTrainer();
  if (!trainer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { team, level, friendCode, preferredSpriteStyle } = await request.json();

  if (team !== undefined && team !== null && !TEAMS.includes(team)) {
    return NextResponse.json({ error: "Équipe invalide" }, { status: 400 });
  }
  if (preferredSpriteStyle !== undefined && preferredSpriteStyle !== null && !SPRITE_STYLES.includes(preferredSpriteStyle)) {
    return NextResponse.json({ error: "Style de sprite invalide" }, { status: 400 });
  }

  const parsedLevel = level != null ? Number(level) : null;
  if (parsedLevel !== null && (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 80)) {
    return NextResponse.json({ error: "Niveau invalide (1-80)" }, { status: 400 });
  }

  const updated = await prisma.trainer.update({
    where: { id: trainer.id },
    data: {
      ...(team !== undefined && { team: team || null }),
      ...(level !== undefined && { level: parsedLevel }),
      ...(friendCode !== undefined && {
        friendCode: typeof friendCode === "string" ? friendCode.trim() || null : null,
      }),
      ...(preferredSpriteStyle !== undefined && { preferredSpriteStyle }),
    },
  });

  return NextResponse.json(updated);
}
