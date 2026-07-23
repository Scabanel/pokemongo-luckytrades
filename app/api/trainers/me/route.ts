import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

const TEAMS = ["instinct", "mystic", "valor"];

// Permet à un compte connecté de modifier sa propre équipe/niveau, sans
// passer par PATCH /api/trainers/[id] qui est réservé à l'admin.
export async function PATCH(request: NextRequest) {
  const { trainer } = await getCurrentTrainer();
  if (!trainer) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { team, level } = await request.json();

  if (team !== undefined && team !== null && !TEAMS.includes(team)) {
    return NextResponse.json({ error: "Équipe invalide" }, { status: 400 });
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
    },
  });

  return NextResponse.json(updated);
}
