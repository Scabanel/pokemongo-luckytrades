import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import KonamiEasterEgg from "@/components/KonamiEasterEgg";

export const metadata: Metadata = {
  title: "Échanges Pokémon Go Strasbourg",
  description: "Catalogue de trades Pokémon GO",
  icons: {
    icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Exo+2:wght@400;600;700;800;900&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <KonamiEasterEgg />
        <Toaster
          position="bottom-right"
          /* 64px en dur passait derriere la barre d'onglets sur un iPhone a encoche, ou
             les 60px d'onglets plus 34px de zone sure en font 94. Meme variable que le
             bouton flottant : ce qui occupe le bas de l'ecran ne se recopie pas. */
          containerStyle={{ bottom: "calc(var(--bas-occupe) + 16px)" }}
          toastOptions={{
            style: {
              background: "var(--papier)",
              border: "1px solid color-mix(in srgb, var(--encre) 18%, transparent)",
              color: "var(--encre)",
              borderRadius: "14px",
              fontFamily: "Inter, sans-serif",
            },
            success: {
              iconTheme: { primary: "var(--encre)", secondary: "var(--papier)" },
            },
            error: {
              iconTheme: { primary: "var(--alerte)", secondary: "var(--papier)" },
            },
          }}
        />
      </body>
    </html>
  );
}
