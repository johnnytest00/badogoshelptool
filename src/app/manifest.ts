import type { MetadataRoute } from "next";

/** Telepíthetőség. Offline működés NINCS: nincs service worker, a szerveres munkafolyamatok hálózatot igényelnek. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TetőPro — bádogos műhely",
    short_name: "TetőPro",
    description: "Tetőfedő és bádogos munkafolyamatok egy helyen: felmérés, kalkuláció, anyaglista, ajánlat, munkanapló.",
    lang: "hu",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#111923",
    theme_color: "#e85d04",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
