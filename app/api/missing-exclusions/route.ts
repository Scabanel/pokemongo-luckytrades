import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

// Filtre appliqué à la lecture par-dessus data/missing-in-go.json (voir
// app/pas-encore-sortis/page.tsx) : ne modifie jamais ce fichier lui-même,
// régénéré périodiquement par le cron de rafraîchissement.
export async function GET() {
  const exclusions = await prisma.missingPokemonExclusion.findMany();
  return NextResponse.json(exclusions);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { category, pokemonId } = await request.json();
  if (!category || typeof pokemonId !== "number") {
    return NextResponse.json({ error: "category et pokemonId requis" }, { status: 400 });
  }

  const exclusion = await prisma.missingPokemonExclusion.upsert({
    where: { category_pokemonId: { category, pokemonId } },
    update: {},
    create: { category, pokemonId },
  });

  return NextResponse.json(exclusion, { status: 201 });
}
