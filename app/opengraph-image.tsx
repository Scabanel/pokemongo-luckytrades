import { ImageResponse } from "next/og";

export const alt = "Lucky Trades — Échanges Pokémon GO Strasbourg";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0700 0%, #1a0f05 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            color: "rgba(255,180,30,0.65)",
            marginBottom: 18,
            textTransform: "uppercase",
          }}
        >
          Pokémon GO · Strasbourg
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
            alt=""
            width={84}
            height={84}
          />
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: 800,
              color: "#ffd700",
              textTransform: "uppercase",
            }}
          >
            Lucky Trades
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(232,237,245,0.75)",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Organise tes échanges avec les membres de la communauté POGO Strasbourg
        </div>
      </div>
    ),
    { ...size }
  );
}
