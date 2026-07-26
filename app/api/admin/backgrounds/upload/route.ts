import { NextRequest, NextResponse } from "next/server";
import { getCurrentTrainer } from "@/lib/auth";
import { createBinaryFile, listRepoDirectory } from "@/lib/github-repo";
import { slugify } from "@/scripts/generate-pokemon-backgrounds.mjs";

// Téléverse une image de fond choisie par Steven (upload manuel, pas un
// scrape) dans public/event-backgrounds/ via l'API Contents GitHub (même
// mécanisme que le cron refresh-data) : le runtime Vercel a un système de
// fichiers en lecture seule, impossible d'écrire directement sur disque.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { filename, dataBase64 } = await request.json();
  if (typeof filename !== "string" || typeof dataBase64 !== "string" || !filename || !dataBase64) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(dataBase64, "base64");
    const baseSlug = slugify(filename);
    const existing = await listRepoDirectory("public/event-backgrounds");

    // Évite d'écraser un fichier existant du même nom : suffixe numérique
    // jusqu'à trouver un nom libre plutôt que de remplacer une autre image.
    let slug = baseSlug;
    let n = 1;
    while (existing.has(slug)) {
      const dot = baseSlug.lastIndexOf(".");
      slug = dot === -1 ? `${baseSlug}-${n}` : `${baseSlug.slice(0, dot)}-${n}${baseSlug.slice(dot)}`;
      n++;
    }

    await createBinaryFile(`public/event-backgrounds/${slug}`, buffer, `Ajout fond (admin) : ${slug}`);
    return NextResponse.json({ url: `/event-backgrounds/${slug}` });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
