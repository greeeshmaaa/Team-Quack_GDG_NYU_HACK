import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NYC Lens",
    short_name: "NYC Lens",
    description: "A premium camera-first civic storytelling guide for New York City.",
    start_url: "/",
    display: "standalone",
    background_color: "#04050a",
    theme_color: "#04050a",
    orientation: "portrait",
    icons: [],
  };
}
