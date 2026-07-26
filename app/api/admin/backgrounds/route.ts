import { NextRequest, NextResponse } from "next/server";
import { getCurrentTrainer } from "@/lib/auth";
import { putIfChangedText } from "@/lib/github-repo";

type BackgroundEntry = { label: string; url: string };

// Enregistre l'état complet des deux catalogues de fonds (l'admin envoie
// toujours l'état final voulu, comme le fait déjà le cron refresh-data) :
// pas besoin de relire l'état actuel sur GitHub, ni de migrer les entrées
// PokemonEntry.backgroundUrl (simple chaîne d'URL sans clé étrangère, voir
// components/BackgroundManager.tsx).
export const maxDuration = 30;

export async function PUT(request: NextRequest) {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const backgrounds = body.backgrounds;
  const pokemonBackgrounds = body.pokemonBackgrounds;

  if (!Array.isArray(backgrounds) || typeof pokemonBackgrounds !== "object" || pokemonBackgrounds === null) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const isValidList = (list: unknown): list is BackgroundEntry[] =>
    Array.isArray(list) && list.every((e) => typeof e?.label === "string" && typeof e?.url === "string");
  if (!isValidList(backgrounds) || !Object.values(pokemonBackgrounds).every(isValidList)) {
    return NextResponse.json({ error: "Entrée de fond invalide" }, { status: 400 });
  }

  try {
    const runId = new Date().toISOString();
    const [generic, perSpecies] = await Promise.all([
      putIfChangedText("data/backgrounds.json", JSON.stringify(backgrounds, null, 2) + "\n", `Fonds génériques (admin) : ${runId}`),
      putIfChangedText("data/pokemon-backgrounds.json", JSON.stringify(pokemonBackgrounds, null, 2) + "\n", `Fonds validés (admin) : ${runId}`),
    ]);
    return NextResponse.json({ generic, perSpecies });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
