import type { MetadataRoute } from "next";
import { MARKETING_ORIGIN, MARKETING_PATHS } from "@/lib/hosts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [...MARKETING_PATHS].map((path) => ({
    url: path === "/" ? MARKETING_ORIGIN : `${MARKETING_ORIGIN}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
