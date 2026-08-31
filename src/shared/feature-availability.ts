export type ManagedFeature = "sms";

export type FeatureAvailability = {
  available: boolean;
  description: string;
  label: string;
  title: string;
};

const FEATURES: Record<ManagedFeature, FeatureAvailability> = {
  sms: {
    available: true,
    description: "Lender messaging is available when sender approval and quota are configured.",
    label: "SMS messaging",
    title: "SMS messaging",
  },
};

export function getFeatureAvailability(
  feature: ManagedFeature,
): FeatureAvailability {
  return FEATURES[feature];
}

export function isFeatureAvailable(feature: ManagedFeature) {
  return getFeatureAvailability(feature).available;
}
