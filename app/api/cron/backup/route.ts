import { NextRequest, NextResponse } from "next/server";
import { buildBackupPayload } from "@/lib/backup";

// Backup automatique quotidien : déclenché par Vercel Cron (voir vercel.json),
// commit un snapshot JSON des dresseurs + entrées dans le dépôt GitHub du
// projet (backups/latest.json). L'historique git du fichier sert de journal
// des sauvegardes successives — pas besoin d'un service de stockage en plus.
//
// Variables d'environnement requises (à ajouter dans le dashboard Vercel) :
//   CRON_SECRET         — chaîne aléatoire ; Vercel l'envoie automatiquement
//                         en "Authorization: Bearer <CRON_SECRET>" pour les
//                         requêtes cron dès qu'elle est définie.
//   GITHUB_TOKEN        — Personal Access Token GitHub (fine-grained),
//                         scope "Contents: Read and write" sur ce seul repo.
//   GITHUB_BACKUP_REPO  — "owner/repo", ex: "Scabanel/pokemongo-luckytrades".
//
// Voir README.md pour la procédure de configuration complète.

export const maxDuration = 30;

const BACKUP_PATH = "backups/latest.json";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_BACKUP_REPO;
  if (!githubToken || !githubRepo) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN / GITHUB_BACKUP_REPO manquants — voir README.md" },
      { status: 500 }
    );
  }

  const payload = await buildBackupPayload();
  const content = JSON.stringify(payload, null, 2);
  const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${BACKUP_PATH}`;
  const githubHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
  };

  // L'API GitHub exige le sha du fichier existant pour le mettre à jour
  // (sinon elle refuse en pensant qu'on écraserait un changement concurrent).
  let sha: string | undefined;
  const getRes = await fetch(apiUrl, { headers: githubHeaders });
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  } else if (getRes.status !== 404) {
    const detail = await getRes.text();
    return NextResponse.json(
      { error: "Impossible de lire le backup existant sur GitHub", detail },
      { status: 502 }
    );
  }

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...githubHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Backup auto — ${payload.exportedAt}`,
      content: Buffer.from(content, "utf-8").toString("base64"),
      ...(sha && { sha }),
    }),
  });

  if (!putRes.ok) {
    const detail = await putRes.text();
    return NextResponse.json(
      { error: "Échec du commit du backup sur GitHub", detail },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    exportedAt: payload.exportedAt,
    trainers: payload.trainers.length,
    entries: payload.entries.length,
  });
}
