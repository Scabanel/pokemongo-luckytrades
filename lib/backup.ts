import { prisma } from "./prisma";

// Format de sauvegarde partagé entre l'export manuel (app/api/export) et le
// backup automatique quotidien (app/api/cron/backup) — une seule requête à
// tenir à jour si le format évolue.
export async function buildBackupPayload() {
  const [entries, trainers] = await Promise.all([
    prisma.pokemonEntry.findMany({
      include: { trainer: true },
      // createdAt seul n'est pas un ordre total (108 entrées partagent la même milliseconde
      // après un ajout en masse) : sans l'id, l'ordre change d'un jour à l'autre et git voit
      // un fichier entièrement réécrit (5 700 lignes) alors que rien n'a bougé.
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.trainer.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    trainers,
    entries,
  };
}
