import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Les échanges chanceux du V",
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#141926",
              border: "1px solid rgba(10, 255, 224, 0.18)",
              color: "#e8edf5",
              borderRadius: "14px",
              fontFamily: "Inter, sans-serif",
            },
            success: {
              iconTheme: { primary: "#0affe0", secondary: "#0b0f1a" },
            },
            error: {
              iconTheme: { primary: "#ff6b6b", secondary: "#0b0f1a" },
            },
          }}
        />
      </body>
    </html>
  );
}
