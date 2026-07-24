import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import DresseurPageClient from "./DresseurPageClient";

// Server Component (contrairement au reste de la page, qui est côté client) :
// generateMetadata ne peut tourner que dans un composant serveur, nécessaire
// pour que Discord/Twitter/Facebook affichent une belle miniature de lien
// quand un dresseur partage sa page (voir aussi opengraph-image.tsx).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const trainer = await prisma.trainer.findUnique({ where: { id } });

  if (!trainer) {
    return { title: "Dresseur introuvable · Lucky Trades" };
  }

  const total = await prisma.pokemonEntry.count({ where: { trainerId: id, completed: false } });
  const title = `${trainer.name} · Échanges Pokémon GO`;
  const description =
    total > 0
      ? `${total} échange${total > 1 ? "s" : ""} disponible${total > 1 ? "s" : ""} : recherches, dons et miroirs de ${trainer.name}.`
      : `Retrouvez les échanges Pokémon GO de ${trainer.name}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DresseurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DresseurPageClient id={id} />;
}
