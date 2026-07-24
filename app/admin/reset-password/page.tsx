import { redirect } from "next/navigation";

// Ancien chemin de réinitialisation de mot de passe, gardé pour les liens déjà
// envoyés par email avant le renommage vers "/mon-espace".
export default function AdminResetPasswordRedirect() {
  redirect("/mon-espace/reset-password");
}
