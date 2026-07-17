import type { NextConfig } from "next";

const standalone = process.env.NEXT_OUTPUT_MODE === "standalone";

const nextConfig: NextConfig = {
  output: standalone ? "standalone" : undefined,
  outputFileTracingIncludes: {
    "/*": ["./site-config/**/*", "./content/**/*"],
  },
};

export default nextConfig;
