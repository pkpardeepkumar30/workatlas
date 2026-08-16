import type { Metadata } from "next";
import { getSiteConfig } from "@/config/loader";
import { getPublicEnvironment } from "@/lib/public-env";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();
  const environment = getPublicEnvironment();
  return {
    metadataBase: new URL(environment.appUrl),
    applicationName: environment.appName,
    title: { default: site.name, template: `%s | ${site.name}` },
    description: site.description,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION
        ?? "QZKlx20EzRZOmyXTxim9MDEhPGHFTNe71ow3-tpzN4U",
    },
    openGraph: {
      type: "website",
      title: site.name,
      description: site.description,
      siteName: site.name,
      url: environment.appUrl,
    },
  };
}

export const runtime = "nodejs";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteConfig();
  return <html lang={site.locale}><body>{children}</body></html>;
}
