import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { trainerId, tradeForPokemonName, tradeForPokemonId, notes, completed, category, shiny, customSpriteUrl, priority, tags } =
    body;

  try {
    const entry = await prisma.pokemonEntry.update({
      where: { id },
      data: {
        ...(trainerId !== undefined && { trainerId: trainerId || null }),
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
        ...(priority !== undefined && { priority: priority != null ? Number(priority) : null }),
        ...(tags !== undefined && { tags: Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null }),
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
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.pokemonEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
