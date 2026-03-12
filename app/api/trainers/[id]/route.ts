import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
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
