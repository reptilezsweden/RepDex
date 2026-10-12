import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RepDex",
    short_name: "RepDex",
    description: "Track your Pokémon GO collection across every dex.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#2f8f5b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
