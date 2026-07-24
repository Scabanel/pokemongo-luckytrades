import { redirect } from "next/navigation";

// "/admin" a été renommé "/mon-espace" : cette page n'est plus un espace
// d'administration mais l'espace personnel de chaque dresseur. Cette route
// ne sert plus qu'à rediriger les anciens liens/favoris.
export default function AdminRedirect() {
  redirect("/mon-espace");
}
