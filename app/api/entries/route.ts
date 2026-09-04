import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";
import { POKEMON_SIZES } from "@/lib/entryMatching";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showCompleted = searchParams.get("completed") === "true";
  const trainerId = searchParams.get("trainerId");

  /* ═══ UNE LIMITE, POUR NE PAS PAYER 2 000 ENTREES POUR EN MONTRER 18 ═══

     Ajoutee le 2026-09-04 pour la bande de shiny de la landing. Sans elle, la page la plus
     visitee du site tirait les 1 988 entrees avec leur dresseur joint pour en afficher une
     poignee : un cout de base de donnees a chaque visite, pour de la decoration.

     Bornee a 200 cote serveur et pas seulement cote appelant : une limite qu'on peut
     demander a 100 000 n'est pas une limite, c'est une suggestion. Absente, le
     comportement ne change pas, donc aucun appelant existant n'est affecte. */
  const limiteDemandee = Number(searchParams.get("limit"));
  const limite = Number.isFinite(limiteDemandee) && limiteDemandee > 0
    ? Math.min(Math.floor(limiteDemandee), 200)
    : undefined;
  const seulementShiny = searchParams.get("shiny") === "true";

  const entries = await prisma.pokemonEntry.findMany({
    where: {
      ...(showCompleted ? undefined : { completed: false }),
      ...(trainerId ? { trainerId } : undefined),
      ...(seulementShiny ? { shiny: true } : undefined),
    },
    include: { trainer: true },
    orderBy: { createdAt: "desc" },
    ...(limite ? { take: limite } : undefined),
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const { trainer, isAdmin } = await getCurrentTrainer();
  if (!trainer && !isAdmin) {
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
    tradePartnerName,
    linkedEntryId,
    notes,
    shiny,
    gender,
    size,
    exclusiveMove,
    customSpriteUrl,
    backgroundUrl,
    priority,
    tags,
    quantity,
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

  if (size != null && !(POKEMON_SIZES as readonly string[]).includes(size)) {
    return NextResponse.json({ error: "Taille invalide" }, { status: 400 });
  }

  // Un compte non-admin ne peut créer une entrée que sous son propre
  // dresseur, quelle que soit la valeur envoyée par le client.
  const effectiveTrainerId = isAdmin ? trainerId || null : trainer!.id;
  const trimmedPartnerName =
    typeof tradePartnerName === "string" ? tradePartnerName.trim() || null : null;

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.pokemonEntry.create({
        data: {
          pokemonName,
          pokemonId: Number(pokemonId),
          category,
          trainerId: effectiveTrainerId,
          tradeForPokemonName: tradeForPokemonName || null,
          tradeForPokemonId: tradeForPokemonId ? Number(tradeForPokemonId) : null,
          tradePartnerName: trimmedPartnerName,
          notes: notes || null,
          shiny: shiny === true,
          gender: gender === "male" || gender === "female" ? gender : null,
          size: size != null ? size : null,
          exclusiveMove: exclusiveMove === true,
          customSpriteUrl: customSpriteUrl || null,
          backgroundUrl: backgroundUrl || null,
          priority: priority != null ? Number(priority) : null,
          tags: Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null,
          quantity: quantity != null && Number(quantity) > 0 ? Number(quantity) : 1,
        },
      });

      // Association automatique avec une de ses propres entrées de la
      // catégorie opposée (want <-> give) : voir Item 7 du plan. Les deux
      // entrées se synchronisent (Pokémon échangé + partenaire) pour ne pas
      // avoir à répéter la même info des deux côtés.
      if (linkedEntryId) {
        const target = await tx.pokemonEntry.findUnique({ where: { id: linkedEntryId } });
        if (!target || target.trainerId !== effectiveTrainerId) {
          throw new Error("INVALID_LINK");
        }
        const sharedPartnerName = trimmedPartnerName ?? target.tradePartnerName ?? null;
        await tx.pokemonEntry.update({
          where: { id: created.id },
          data: {
            linkedEntryId,
            tradeForPokemonName: target.pokemonName,
            tradeForPokemonId: target.pokemonId,
            tradeForShiny: target.shiny,
            tradeForCustomSpriteUrl: target.customSpriteUrl,
            tradePartnerName: sharedPartnerName,
          },
        });
        await tx.pokemonEntry.update({
          where: { id: target.id },
          data: {
            linkedEntryId: created.id,
            tradeForPokemonName: created.pokemonName,
            tradeForPokemonId: created.pokemonId,
            tradeForShiny: created.shiny,
            tradeForCustomSpriteUrl: created.customSpriteUrl,
            tradePartnerName: sharedPartnerName,
          },
        });
      }

      return tx.pokemonEntry.findUniqueOrThrow({
        where: { id: created.id },
        include: { trainer: true },
      });
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_LINK") {
      return NextResponse.json({ error: "Entrée à lier invalide" }, { status: 400 });
    }
    console.error("[POST /api/entries]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
