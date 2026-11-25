// En-têtes de cache HTTP pour les GET publics (identiques pour tous les visiteurs).
//
// Pourquoi : chaque GET non caché = 1 invocation de fonction Vercel + 1 à 2 requêtes
// Postgres (Supabase), pour chaque visiteur et chaque page. Avec s-maxage, le CDN de Vercel
// répond à leur place sans réveiller la fonction ni la base. stale-while-revalidate sert la
// version un peu ancienne pendant qu'une seule requête la rafraîchit en arrière-plan.
//
// À n'utiliser QUE sur des réponses qui ne dépendent pas de l'utilisateur connecté
// (jamais /api/auth/me, jamais une route qui lit la session).
//
// Après une écriture, le client qui doit revoir sa propre modif ajoute un paramètre
// `_=${Date.now()}` à son GET (voir DresseurPageClient et AdminPanel) : l'URL change, le CDN
// ne sert donc pas la copie périmée.

export const CACHE_LISTES = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

// Compteur du pied de page : affiché sur toutes les pages, change rarement.
export const CACHE_COMPTEUR = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
} as const;
