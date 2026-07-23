import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTrainer } from "@/lib/auth";

// Public, comme GET /api/trainers : alimente la page de profil d'un dresseur.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const trainer = await prisma.trainer.findUnique({ where: { id } });
  if (!trainer) {
    return NextResponse.json({ error: "Dresseur introuvable" }, { status: 404 });
  }

  return NextResponse.json(trainer);
}

// Filet de rattrapage admin : délier ou réassigner un authUserId en cas de
// rattachement erroné à l'inscription (voir app/api/auth/signup/route.ts).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { authUserId, team, level } = await request.json();

  const trainer = await prisma.trainer.update({
    where: { id },
    data: {
      ...(authUserId !== undefined && { authUserId: authUserId || null }),
      ...(team !== undefined && { team: team || null }),
      ...(level !== undefined && { level: level != null ? Number(level) : null }),
    },
  });

  return NextResponse.json(trainer);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  // Unlink entries first
  await prisma.pokemonEntry.updateMany({
    where: { trainerId: id },
    data: { trainerId: null },
  });

  await prisma.trainer.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
