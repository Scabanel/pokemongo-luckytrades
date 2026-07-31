import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint public dédié et léger pour le compteur du footer (SiteFooter.tsx,
// affiché sur toutes les pages) : évite de refetch la liste complète des
// dresseurs (GET /api/trainers, déjà utilisée par app/dresseurs/page.tsx)
// juste pour en lire la longueur.
export async function GET() {
  const count = await prisma.trainer.count();
  return NextResponse.json({ count });
}
