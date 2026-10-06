import type { Metadata } from "next";
import { MARKETING_ORIGIN, PRODUCT_NAME } from "@/lib/hosts";

export const SITE_TITLE = `${PRODUCT_NAME} — One keyword. One Reel. One private reply.`;
export const SITE_DESCRIPTION =
  "Keyword comments on a Reel or post you choose become one private reply through official Meta APIs. Pay in ₹ with Razorpay — not bulk DMs, not USD billing.";
export const OG_IMAGE_PATH = "/brand/hero-dashboard-preview.png";

export function pageSeo(
  path: string,
  opts: { title?: string; description?: string } = {},
): Metadata {
  const title = opts.title ?? SITE_TITLE;
  const description = opts.description ?? SITE_DESCRIPTION;
  const url = path === "/" ? MARKETING_ORIGIN : `${MARKETING_ORIGIN}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: PRODUCT_NAME,
      title,
      description,
      url,
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 575,
          height: 390,
          alt: `${PRODUCT_NAME} dashboard`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE_PATH],
    },
  };
}
