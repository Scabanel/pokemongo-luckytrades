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

  const { name, team, level, friendCode, preferredSpriteStyle, city } = await request.json();

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
  }
  if (team !== undefined && team !== null && !TEAMS.includes(team)) {
    return NextResponse.json({ error: "Équipe invalide" }, { status: 400 });
  }
  if (city !== undefined && !city?.trim()) {
    return NextResponse.json({ error: "Ville obligatoire" }, { status: 400 });
  }
  if (preferredSpriteStyle !== undefined && preferredSpriteStyle !== null && !SPRITE_STYLES.includes(preferredSpriteStyle)) {
    return NextResponse.json({ error: "Style de sprite invalide" }, { status: 400 });
  }

  const parsedLevel = level != null ? Number(level) : null;
  if (parsedLevel !== null && (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 80)) {
    return NextResponse.json({ error: "Niveau invalide (1-80)" }, { status: 400 });
  }

  try {
    const updated = await prisma.trainer.update({
      where: { id: trainer.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(team !== undefined && { team: team || null }),
        ...(level !== undefined && { level: parsedLevel }),
        ...(friendCode !== undefined && {
          friendCode: typeof friendCode === "string" ? friendCode.trim() || null : null,
        }),
        ...(preferredSpriteStyle !== undefined && { preferredSpriteStyle }),
        ...(city !== undefined && { city: city.trim() }),
      },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    // Contrainte unique sur Trainer.name (voir prisma/schema.prisma) : un
    // autre dresseur a déjà exactement ce nom.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Ce nom de dresseur est déjà pris" }, { status: 409 });
    }
    throw err;
  }
}
