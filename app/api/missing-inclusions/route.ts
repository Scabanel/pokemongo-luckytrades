import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

// Ajout manuel à la lecture par-dessus data/missing-in-go.json (voir
// app/pas-encore-sortis/page.tsx) : symétrique de missing-exclusions, pour
// les cas où les données de jeu générées disent à tort qu'une espèce est
// présente. Ne modifie jamais ce fichier lui-même, régénéré périodiquement
// par le cron de rafraîchissement.
export async function GET() {
  const inclusions = await prisma.missingPokemonInclusion.findMany();
  return NextResponse.json(inclusions);
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

  const inclusion = await prisma.missingPokemonInclusion.upsert({
    where: { category_pokemonId: { category, pokemonId } },
    update: {},
    create: { category, pokemonId },
  });

  return NextResponse.json(inclusion, { status: 201 });
}
