import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showCompleted = searchParams.get("completed") === "true";

  const entries = await prisma.pokemonEntry.findMany({
    where: showCompleted ? undefined : { completed: false },
    include: { trainer: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const {
    pokemonName,
    pokemonId,
    category,
    trainerId,
    tradeForPokemonName,
    tradeForPokemonId,
    notes,
  } = body;

  if (!pokemonName || !pokemonId || !category) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants" },
      { status: 400 }
    );
  }

  if (!["want", "give", "mirror"].includes(category)) {
    return NextResponse.json(
      { error: "Catégorie invalide" },
      { status: 400 }
    );
  }

  const entry = await prisma.pokemonEntry.create({
    data: {
      pokemonName,
      pokemonId: Number(pokemonId),
      category,
      trainerId: trainerId || null,
      tradeForPokemonName: tradeForPokemonName || null,
      tradeForPokemonId: tradeForPokemonId ? Number(tradeForPokemonId) : null,
      notes: notes || null,
    },
    include: { trainer: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
