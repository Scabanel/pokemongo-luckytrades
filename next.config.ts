import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
  },
  // Les fonds d'événement sont stockés en WebP (voir nomWebp dans
  // scripts/generate-pokemon-backgrounds.mjs), mais leurs URLs d'origine en .png/.jpg sont
  // gardées partout : en base (PokemonEntry.backgroundUrl) et dans data/*.json, et le matching
  // compare ces chaînes. Cette réécriture sert le .webp sous l'ancienne URL, sans redirection.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/event-backgrounds/:nom(.+)\\.:ext(png|jpg|jpeg)",
          destination: "/event-backgrounds/:nom.webp",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // Fichiers publics : sans ceci Vercel les sert avec max-age=0 (revalidation à chaque visite).
  // Un fond n'est jamais écrasé (un nom pris reçoit un suffixe), donc 7 jours sont sans risque.
  async headers() {
    return [
      {
        source: "/event-backgrounds/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
        ],
      },
    ];
  },
};

export default nextConfig;
