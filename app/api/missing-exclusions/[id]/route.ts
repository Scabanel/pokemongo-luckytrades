import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

// Annule une exclusion (remet un Pokémon dans la liste publique).
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
    await prisma.missingPokemonExclusion.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Exclusion introuvable" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
