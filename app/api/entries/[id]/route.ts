import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { trainer, isAdmin } = await getCurrentTrainer();
  if (!trainer && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.pokemonEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }
  if (!isAdmin && existing.trainerId !== trainer!.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { trainerId, tradeForPokemonName, tradeForPokemonId, notes, completed, category, shiny, customSpriteUrl, backgroundUrl, priority, tags, quantity } =
    body;

  // Seul un admin peut réassigner une entrée à un autre dresseur.
  try {
    const entry = await prisma.pokemonEntry.update({
      where: { id },
      data: {
        ...(isAdmin && trainerId !== undefined && { trainerId: trainerId || null }),
        ...(tradeForPokemonName !== undefined && {
          tradeForPokemonName: tradeForPokemonName || null,
        }),
        ...(tradeForPokemonId !== undefined && {
          tradeForPokemonId: tradeForPokemonId ? Number(tradeForPokemonId) : null,
        }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(completed !== undefined && { completed }),
        ...(category !== undefined && { category }),
        ...(shiny !== undefined && { shiny: shiny === true }),
        ...(customSpriteUrl !== undefined && { customSpriteUrl: customSpriteUrl || null }),
        ...(backgroundUrl !== undefined && { backgroundUrl: backgroundUrl || null }),
        ...(priority !== undefined && { priority: priority != null ? Number(priority) : null }),
        ...(tags !== undefined && { tags: Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null }),
        ...(quantity !== undefined && { quantity: Math.max(1, Number(quantity) || 1) }),
      },
      include: { trainer: true },
    });
    return NextResponse.json(entry);
  } catch (err) {
    console.error("[PATCH /api/entries/:id]", err);
    return NextResponse.json(
      { error: "Erreur serveur", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { trainer, isAdmin } = await getCurrentTrainer();
  if (!trainer && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.pokemonEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }
  if (!isAdmin && existing.trainerId !== trainer!.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.pokemonEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
