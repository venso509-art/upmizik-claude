import type { MetadataRoute } from "next";

// Pèmèt moun "Ajoute sou ekran akèy" telefòn yo, tankou yon app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UpMizik",
    short_name: "UpMizik",
    description: "Platfòm mizik 100% ayisyen. Koute, sipòte atis yo, epi sove mizik pou koute san entènèt.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B132B",
    theme_color: "#0B132B",
    lang: "ht",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Mizik offline", url: "/telechaje" }],
  };
}
