import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

// Création en masse depuis le picker "Ajouter plusieurs Pokémon" (voir
// components/BulkAddPicker.tsx) : un seul aller-retour DB via createMany au
// lieu d'un POST /api/entries par tuile cliquée.
export async function POST(request: NextRequest) {
  const { trainer, isAdmin } = await getCurrentTrainer();
  if (!trainer && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { trainerId, category, items } = await request.json();

  if (!["want", "give", "mirror"].includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Aucun Pokémon sélectionné" }, { status: 400 });
  }

  const effectiveTrainerId = isAdmin ? trainerId || null : trainer!.id;

  const created = await prisma.pokemonEntry.createMany({
    data: items.map((it: Record<string, unknown>) => ({
      pokemonName: String(it.pokemonName ?? ""),
      pokemonId: Number(it.pokemonId),
      category,
      trainerId: effectiveTrainerId,
      shiny: it.shiny === true,
      customSpriteUrl: typeof it.customSpriteUrl === "string" ? it.customSpriteUrl : null,
      tags: Array.isArray(it.tags) && it.tags.length > 0 ? JSON.stringify(it.tags) : null,
    })),
  });

  return NextResponse.json({ success: true, count: created.count });
}
