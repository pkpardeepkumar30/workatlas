import type { MetadataRoute } from "next";
import { getPublicEnvironment } from "@/lib/public-env";

export default function robots(): MetadataRoute.Robots {
  const { appUrl } = getPublicEnvironment();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/docs/"],
      disallow: ["/api/", "/dashboard/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email"],
    },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
    host: appUrl,
  };
}
