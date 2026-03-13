import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [entries, trainers] = await Promise.all([
    prisma.pokemonEntry.findMany({
      include: { trainer: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.trainer.findMany({ orderBy: { name: "asc" } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    trainers,
    entries,
  };

  const date = new Date().toISOString().slice(0, 10);
  const filename = `luckytrades-backup-${date}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
