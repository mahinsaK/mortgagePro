export const appwriteServerConfig = {
  endpoint:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
    "https://cloud.appwrite.io/v1",
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "",
  apiKey: process.env.APPWRITE_RUNTIME_API_KEY ?? "",
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "",
  collections: {
    lenders: process.env.NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID ?? "lenders",
    borrowers:
      process.env.NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID ?? "borrowers",
    collectors:
      process.env.NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID ?? "collectors",
    loans: process.env.NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID ?? "loans",
    payments:
      process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID ?? "payments",
    authRateLimits:
      process.env.APPWRITE_AUTH_RATE_LIMITS_COLLECTION_ID ?? "auth_rate_limits",
    securityEvents:
      process.env.APPWRITE_SECURITY_EVENTS_COLLECTION_ID ?? "security_events",
  },
};

export function getAppBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL?.trim();

  if (!configuredUrl) {
    throw new Error("APP_BASE_URL is required for authentication callbacks.");
  }

  const url = new URL(configuredUrl);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_BASE_URL must be a valid HTTP(S) origin.");
  }

  return url.origin;
}
