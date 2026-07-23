import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const TEAMS = ["instinct", "mystic", "valor"];

export async function POST(request: NextRequest) {
  const { email, password, displayName, team, level } = await request.json();

  if (!email || !password || !displayName?.trim() || !team || level == null) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants" },
      { status: 400 }
    );
  }

  if (!TEAMS.includes(team)) {
    return NextResponse.json({ error: "Équipe invalide" }, { status: 400 });
  }

  const parsedLevel = Number(level);
  if (!Number.isInteger(parsedLevel) || parsedLevel < 1 || parsedLevel > 80) {
    return NextResponse.json({ error: "Niveau invalide (1-80)" }, { status: 400 });
  }

  const normalizedName = displayName.trim();

  // Pré-vérification (avant de créer le compte Supabase) pour éviter de créer
  // un compte auth orphelin si le nom est déjà réclamé par un autre compte.
  const alreadyClaimed = await prisma.trainer.findUnique({
    where: { name: normalizedName },
  });
  if (alreadyClaimed?.authUserId) {
    return NextResponse.json(
      { error: "Ce nom de dresseur est déjà associé à un compte" },
      { status: 409 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Supabase renvoie un user avec `identities: []` (sans erreur, par design
  // anti-énumération) quand l'email est déjà utilisé par un compte existant.
  if (!data.user || data.user.identities?.length === 0) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 409 }
    );
  }

  const authUserId = data.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Trainer"
        WHERE lower(trim(name)) = lower(trim(${normalizedName}))
          AND "authUserId" IS NULL
        FOR UPDATE
      `;

      if (rows.length > 0) {
        await tx.trainer.update({
          where: { id: rows[0].id },
          data: { authUserId, team: team ?? null, level: parsedLevel },
        });
        return;
      }

      const claimed = await tx.trainer.findUnique({ where: { name: normalizedName } });
      if (claimed) {
        throw new Error("NAME_TAKEN");
      }

      await tx.trainer.create({
        data: { name: normalizedName, authUserId, team: team ?? null, level: parsedLevel },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NAME_TAKEN") {
      return NextResponse.json(
        { error: "Ce nom de dresseur est déjà associé à un compte" },
        { status: 409 }
      );
    }
    console.error("[POST /api/auth/signup] rattachement dresseur", err);
    return NextResponse.json(
      { error: "Compte créé mais le rattachement au dresseur a échoué, contacte l'admin" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
