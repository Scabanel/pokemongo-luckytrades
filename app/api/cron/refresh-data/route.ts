import { NextRequest, NextResponse } from "next/server";
import { scrapePogoAvailability } from "@/scripts/generate-pogo-availability.mjs";
import { buildCostumeCatalog } from "@/scripts/generate-costume-catalog.mjs";
import { scrapeValidatedBackgrounds, downloadImage, slugify } from "@/scripts/generate-pokemon-backgrounds.mjs";
import { scrapeUpcomingEvents } from "@/scripts/generate-upcoming-events.mjs";
import { putIfChangedText, createBinaryFile, listRepoDirectory, getExistingMissingInGo } from "@/lib/github-repo";
import pokemonList from "@/data/pokemon.json";

// Rafraîchit périodiquement les données de référence du jeu (fonds
// d'événement, costumes/icônes, Pokémon pas encore sortis) depuis leurs
// sources externes (margxt.fr, PokeMiners/pogo_assets) et committe les
// fichiers changés sur GitHub : exactement comme app/api/cron/backup, ce qui
// déclenche un redéploiement Vercel qui embarque les données à jour.
//
// N'écrit JAMAIS en base de données : aucune ligne de ce fichier ne touche
// Prisma/Supabase. Les listes d'échanges de chaque dresseur sont dans la
// base de données, entièrement indépendante de ces fichiers JSON statiques
// (costumes, fonds, Pokémon manquants) : ce cron ne peut donc pas les
// écraser ou les perdre, quoi qu'il arrive.
//
// Programmé tard la nuit (voir vercel.json) pour ne gêner personne pendant
// une éventuelle réindexation/redéploiement.
//
// Variables requises : CRON_SECRET, GITHUB_TOKEN, GITHUB_BACKUP_REPO (les
// mêmes que app/api/cron/backup, voir README.md).

export const maxDuration = 60;

// Limite le nombre de nouvelles images de fond téléchargées+committées par
// exécution, pour ne pas dépasser maxDuration ni solliciter trop fort
// margxt.fr d'un coup (déjà connu pour rate-limiter après une rafale de
// requêtes, voir scripts/generate-pokemon-backgrounds.mjs). Le reste attend
// la prochaine exécution planifiée.
const MAX_NEW_IMAGES_PER_RUN = 15;

type StepResult = { changed?: boolean; error?: string; [key: string]: unknown };

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_BACKUP_REPO) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN / GITHUB_BACKUP_REPO manquants : voir README.md" },
      { status: 500 }
    );
  }

  const runId = new Date().toISOString();
  const steps: Record<string, StepResult> = {};

  // Le Google Sheet de Steven (source de vérité "qu'est-ce qui est sorti
  // dans GO") et PokeMiners (sprites/costumes) sont indépendants : on les
  // récupère en parallèle.
  //
  // buildCostumeCatalog n'a PAS le GITHUB_TOKEN : ce token est un PAT
  // finement scopé au seul dépôt de ce projet (Contents: read/write), il
  // n'a aucune autorité sur PokeMiners/pogo_assets (un dépôt public
  // différent) et GitHub rejette l'appel si on l'envoie quand même. Le
  // dépôt étant public, un appel anonyme fonctionne très bien (limite de
  // 60/h largement suffisante pour un seul appel hebdomadaire).
  const [availabilityRes, costumeRes] = await Promise.allSettled([
    scrapePogoAvailability(pokemonList),
    buildCostumeCatalog(pokemonList),
  ]);

  if (availabilityRes.status === "rejected") {
    steps.pogoAvailabilityScrape = { error: availabilityRes.reason instanceof Error ? availabilityRes.reason.message : String(availabilityRes.reason) };
  }
  if (costumeRes.status === "rejected") {
    steps.costumeScrape = { error: costumeRes.reason instanceof Error ? costumeRes.reason.message : String(costumeRes.reason) };
  }

  if (costumeRes.status === "fulfilled") {
    const { catalog, icons, gigantamaxIcons, backgrounds } = costumeRes.value;
    try {
      steps.costumes = await putIfChangedText(
        "data/costumes.json",
        JSON.stringify(catalog, null, 2) + "\n",
        `Auto-refresh costumes : ${runId}`
      );
      steps.goIcons = await putIfChangedText(
        "data/go-icons.json",
        JSON.stringify(icons) + "\n",
        `Auto-refresh icônes : ${runId}`
      );
      steps.gigantamaxIcons = await putIfChangedText(
        "data/gigantamax-icons.json",
        JSON.stringify(gigantamaxIcons) + "\n",
        `Auto-refresh icônes Gigamax : ${runId}`
      );
      steps.backgroundsGeneric = await putIfChangedText(
        "data/backgrounds.json",
        JSON.stringify(backgrounds, null, 2) + "\n",
        `Auto-refresh fonds génériques : ${runId}`
      );
    } catch (err) {
      steps.costumeCommit = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // pogo-availability.json (gating Shiny/Dynamax/Gigamax dans le picker) et
  // missing-in-go.json (page "pas encore sortis") viennent tous les deux du
  // même scrape du Google Sheet. Si le scrape a échoué cette fois, on
  // préserve missing-in-go.json depuis le fichier déjà committé plutôt que
  // d'écraser avec du vide ; pogo-availability.json, lui, n'est simplement
  // pas retouché (pas de fallback nécessaire : GitHub garde la dernière
  // version committée telle quelle).
  if (availabilityRes.status === "fulfilled") {
    try {
      steps.pogoAvailability = await putIfChangedText(
        "data/pogo-availability.json",
        JSON.stringify(availabilityRes.value.availability, null, 2) + "\n",
        `Auto-refresh disponibilité GO : ${runId}`
      );
    } catch (err) {
      steps.pogoAvailabilityCommit = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  try {
    const existing = availabilityRes.status === "rejected" ? await getExistingMissingInGo() : {};
    const merged = availabilityRes.status === "fulfilled" ? availabilityRes.value.missing : existing;

    steps.missingInGo = await putIfChangedText(
      "data/missing-in-go.json",
      JSON.stringify(merged, null, 2) + "\n",
      `Auto-refresh Pokémon manquants : ${runId}`
    );
  } catch (err) {
    steps.missingInGoCommit = { error: err instanceof Error ? err.message : String(err) };
  }

  // Fonds validés par Pokémon (margxt.fr) + téléchargement/commit des
  // nouvelles images (plafonné, voir MAX_NEW_IMAGES_PER_RUN).
  try {
    const { byDex, uniqueImageUrls } = await scrapeValidatedBackgrounds();
    steps.pokemonBackgrounds = await putIfChangedText(
      "data/pokemon-backgrounds.json",
      JSON.stringify(byDex, null, 2) + "\n",
      `Auto-refresh fonds validés : ${runId}`
    );

    // Un seul appel pour lister tout le dossier plutôt que de vérifier
    // l'existence de chacune des ~200 images une par une (trop lent, aurait
    // dépassé maxDuration même sans rien de nouveau à committer).
    const existingImages = await listRepoDirectory("public/event-backgrounds");

    let uploaded = 0;
    let skippedForLimit = 0;
    const failed: string[] = [];
    for (const url of uniqueImageUrls) {
      const slug = slugify(url);
      if (existingImages.has(slug)) continue;

      if (uploaded >= MAX_NEW_IMAGES_PER_RUN) {
        skippedForLimit++;
        continue;
      }
      try {
        const buf = await downloadImage(url);
        await createBinaryFile(`public/event-backgrounds/${slug}`, buf, `Auto-ajout fond ${slug} : ${runId}`);
        uploaded++;
      } catch (err) {
        failed.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    steps.backgroundImages = { uploaded, skippedForLimit, failed: failed.length, failedDetails: failed };
    if (skippedForLimit > 0) {
      console.log(`[cron/refresh-data] ${skippedForLimit} images en attente de la prochaine exécution (limite de ${MAX_NEW_IMAGES_PER_RUN}/run atteinte).`);
    }
  } catch (err) {
    steps.pokemonBackgrounds = { error: err instanceof Error ? err.message : String(err) };
  }

  // Événements en cours/à venir (margxt.fr) : source indépendante des autres,
  // une erreur ici n'empêche pas les autres rafraîchissements.
  try {
    const events = await scrapeUpcomingEvents();
    steps.upcomingEvents = await putIfChangedText(
      "data/upcoming-events.json",
      JSON.stringify(events, null, 2) + "\n",
      `Auto-refresh événements : ${runId}`
    );
  } catch (err) {
    steps.upcomingEvents = { error: err instanceof Error ? err.message : String(err) };
  }

  const hasErrors = Object.values(steps).some((s) => "error" in s);
  return NextResponse.json({ success: !hasErrors, runId, steps }, { status: hasErrors ? 207 : 200 });
}
