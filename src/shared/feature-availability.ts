export type ManagedFeature = "sms";

export type FeatureAvailability = {
  available: boolean;
  description: string;
  label: string;
  title: string;
};

const FEATURES: Record<ManagedFeature, FeatureAvailability> = {
  sms: {
    available: false,
    description:
      "Messaging is temporarily unavailable while we improve sender approval and delivery reporting.",
    label: "SMS messaging",
    title: "SMS is under maintenance",
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
