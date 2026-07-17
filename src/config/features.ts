import type { FeatureId, FeaturesConfig } from "@/config/schemas";

export function isFeatureEnabled(features: FeaturesConfig, feature?: FeatureId) {
  if (!feature) return true;
  if (feature === "publicPages" || feature === "docs") return features[feature];
  const dashboardFeature = feature.slice("dashboard.".length) as keyof FeaturesConfig["dashboard"];
  return features.dashboard[dashboardFeature];
}
