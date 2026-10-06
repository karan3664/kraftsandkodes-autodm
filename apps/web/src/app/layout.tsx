import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_ORIGIN, MARKETING_ORIGIN } from "@/lib/hosts";
import { OG_IMAGE_PATH, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(MARKETING_ORIGIN),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "KRAFTSANDKODES",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE_PATH, alt: "KRAFTSANDKODES" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href={APP_ORIGIN} />
        <link rel="dns-prefetch" href={APP_ORIGIN} />
        <link rel="prefetch" href={`${APP_ORIGIN}/auth/signup`} as="document" />
        <link rel="prefetch" href={`${APP_ORIGIN}/auth/login`} as="document" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
