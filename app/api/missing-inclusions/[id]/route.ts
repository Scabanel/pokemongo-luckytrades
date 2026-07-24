import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

// Annule un ajout manuel (retire un Pokémon ajouté à tort).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.missingPokemonInclusion.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Ajout introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
