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
  const { trainerId, tradeForPokemonName, tradeForPokemonId, tradePartnerName, notes, completed, category, shiny, gender, customSpriteUrl, backgroundUrl, priority, tags, quantity } =
    body;
  // Réassigné si on réserve 1 exemplaire d'un stock (voir plus bas) : l'id
  // effectivement lié à cette entrée devient alors la fiche dédiée créée
  // pour la réservation, pas la pile d'origine.
  let linkedEntryId = body.linkedEntryId;

  const linking = linkedEntryId !== undefined;

  // Seul un admin peut réassigner une entrée à un autre dresseur.
  try {
    const entry = await prisma.$transaction(async (tx) => {
      let derivedTradeForName = tradeForPokemonName;
      let derivedTradeForId = tradeForPokemonId;
      let derivedTradeForShiny: boolean | null | undefined = undefined;
      let derivedTradeForCustomSpriteUrl: string | null | undefined = undefined;
      let derivedPartnerName = tradePartnerName;

      if (linking) {
        // Change ou retrait du lien précédent : on délie l'ancien partenaire
        // s'il pointait bien vers cette entrée, pour ne jamais laisser un
        // lien à sens unique vers une entrée qui n'existe plus côté lien.
        if (existing.linkedEntryId && existing.linkedEntryId !== linkedEntryId) {
          await tx.pokemonEntry.updateMany({
            where: { id: existing.linkedEntryId, linkedEntryId: id },
            data: { linkedEntryId: null },
          });
        }

        if (linkedEntryId) {
          const target = await tx.pokemonEntry.findUnique({ where: { id: linkedEntryId } });
          if (!target || target.trainerId !== existing.trainerId) {
            throw new Error("INVALID_LINK");
          }
          derivedTradeForName = target.pokemonName;
          derivedTradeForId = target.pokemonId;
          derivedTradeForShiny = target.shiny;
          derivedTradeForCustomSpriteUrl = target.customSpriteUrl;
          derivedPartnerName =
            tradePartnerName !== undefined
              ? tradePartnerName
              : existing.tradePartnerName ?? target.tradePartnerName ?? null;
          const trimmedDerivedPartnerName =
            typeof derivedPartnerName === "string" ? derivedPartnerName.trim() || null : derivedPartnerName;

          // Réserver 1 exemplaire d'un stock (quantité > 1) ne doit pas
          // marquer TOUT le stock comme parti pour ce partenaire : on
          // détache une fiche dédiée à quantité 1 pour la réservation, et le
          // reste de la pile redevient une entrée générique (sans lien ni
          // partenaire) avec une unité de moins.
          if (target.quantity > 1) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _tid, createdAt: _createdAt, updatedAt: _updatedAt, ...targetRest } = target;
            const reserved = await tx.pokemonEntry.create({
              data: {
                ...targetRest,
                quantity: 1,
                linkedEntryId: id,
                tradeForPokemonName: existing.pokemonName,
                tradeForPokemonId: existing.pokemonId,
                tradeForShiny: existing.shiny,
                tradeForCustomSpriteUrl: existing.customSpriteUrl,
                tradePartnerName: trimmedDerivedPartnerName,
                ...(completed !== undefined && { completed }),
              },
            });
            await tx.pokemonEntry.update({
              where: { id: target.id },
              data: { quantity: target.quantity - 1 },
            });
            linkedEntryId = reserved.id;
          } else {
            await tx.pokemonEntry.update({
              where: { id: target.id },
              data: {
                linkedEntryId: id,
                tradeForPokemonName: existing.pokemonName,
                tradeForPokemonId: existing.pokemonId,
                tradeForShiny: existing.shiny,
                tradeForCustomSpriteUrl: existing.customSpriteUrl,
                tradePartnerName: trimmedDerivedPartnerName,
                ...(completed !== undefined && { completed }),
              },
            });
          }
        }
      } else if (completed !== undefined && existing.linkedEntryId) {
        // Marquer l'échange conclu (ou le rouvrir) des deux côtés : les deux
        // entrées représentent le même échange concret.
        await tx.pokemonEntry.updateMany({
          where: { id: existing.linkedEntryId },
          data: { completed },
        });
      }

      return tx.pokemonEntry.update({
        where: { id },
        data: {
          ...(isAdmin && trainerId !== undefined && { trainerId: trainerId || null }),
          ...(linking && { linkedEntryId: linkedEntryId || null }),
          ...(derivedTradeForName !== undefined && {
            tradeForPokemonName: derivedTradeForName || null,
          }),
          ...(derivedTradeForId !== undefined && {
            tradeForPokemonId: derivedTradeForId ? Number(derivedTradeForId) : null,
          }),
          ...(derivedTradeForShiny !== undefined && { tradeForShiny: derivedTradeForShiny }),
          ...(derivedTradeForCustomSpriteUrl !== undefined && {
            tradeForCustomSpriteUrl: derivedTradeForCustomSpriteUrl,
          }),
          ...(derivedPartnerName !== undefined && {
            tradePartnerName:
              typeof derivedPartnerName === "string"
                ? derivedPartnerName.trim() || null
                : derivedPartnerName,
          }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(completed !== undefined && { completed }),
          ...(category !== undefined && { category }),
          ...(shiny !== undefined && { shiny: shiny === true }),
          ...(gender !== undefined && { gender: gender === "male" || gender === "female" ? gender : null }),
          ...(customSpriteUrl !== undefined && { customSpriteUrl: customSpriteUrl || null }),
          ...(backgroundUrl !== undefined && { backgroundUrl: backgroundUrl || null }),
          ...(priority !== undefined && { priority: priority != null ? Number(priority) : null }),
          ...(tags !== undefined && { tags: Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null }),
          ...(quantity !== undefined && { quantity: Math.max(1, Number(quantity) || 1) }),
        },
        include: { trainer: true },
      });
    });
    return NextResponse.json(entry);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_LINK") {
      return NextResponse.json({ error: "Entrée à lier invalide" }, { status: 400 });
    }
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

  await prisma.$transaction(async (tx) => {
    if (existing.linkedEntryId) {
      await tx.pokemonEntry.updateMany({
        where: { id: existing.linkedEntryId, linkedEntryId: id },
        data: { linkedEntryId: null },
      });
    }
    await tx.pokemonEntry.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
