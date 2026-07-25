import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

export async function GET() {
  const [trainers, shinyCounts] = await Promise.all([
    prisma.trainer.findMany({
      include: {
        _count: { select: { entries: { where: { completed: false, category: { in: ["give", "mirror"] } } } } },
      },
      orderBy: { name: "asc" },
    }),
    // Prisma ne permet qu'un seul _count filtré par relation dans le même
    // findMany : le compte des shiny disponibles à l'échange se fait donc via
    // un groupBy séparé, fusionné ci-dessous plutôt que via N+1 requêtes.
    prisma.pokemonEntry.groupBy({
      by: ["trainerId"],
      where: { completed: false, category: { in: ["give", "mirror"] }, shiny: true },
      _count: { _all: true },
    }),
  ]);

  const shinyCountByTrainerId = new Map(shinyCounts.map((c) => [c.trainerId, c._count._all]));
  const withShinyCount = trainers.map((t) => ({
    ...t,
    _count: { ...t._count, shinyEntries: shinyCountByTrainerId.get(t.id) ?? 0 },
  }));

  return NextResponse.json(withShinyCount);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Nom du dresseur requis" },
      { status: 400 }
    );
  }

  const trainer = await prisma.trainer.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim() },
    include: {
      _count: { select: { entries: { where: { completed: false, category: { in: ["give", "mirror"] } } } } },
    },
  });

  return NextResponse.json(trainer, { status: 201 });
}
