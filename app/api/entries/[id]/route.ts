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
  const { trainerId, tradeForPokemonName, tradeForPokemonId, notes, completed } =
    body;

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
    },
    include: { trainer: true },
  });

  return NextResponse.json(entry);
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
