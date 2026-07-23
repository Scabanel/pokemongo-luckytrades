import { prisma } from "./prisma";

// Format de sauvegarde partagé entre l'export manuel (app/api/export) et le
// backup automatique quotidien (app/api/cron/backup) — une seule requête à
// tenir à jour si le format évolue.
export async function buildBackupPayload() {
  const [entries, trainers] = await Promise.all([
    prisma.pokemonEntry.findMany({
      include: { trainer: true },
      orderBy: { createdAt: "asc" },
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
