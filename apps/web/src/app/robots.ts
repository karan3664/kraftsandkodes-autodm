import type { MetadataRoute } from "next";
import { MARKETING_ORIGIN } from "@/lib/hosts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/auth/"],
    },
    sitemap: `${MARKETING_ORIGIN}/sitemap.xml`,
  };
}
