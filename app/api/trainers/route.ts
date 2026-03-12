import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  const trainers = await prisma.trainer.findMany({
    include: {
      _count: { select: { entries: { where: { completed: false } } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(trainers);
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
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
      _count: { select: { entries: { where: { completed: false } } } },
    },
  });

  return NextResponse.json(trainer, { status: 201 });
}
