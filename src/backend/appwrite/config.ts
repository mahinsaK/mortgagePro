export const appwriteServerConfig = {
  endpoint:
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
    "https://cloud.appwrite.io/v1",
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "",
  apiKey: process.env.APPWRITE_API_KEY ?? process.env.API_KEY ?? "",
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
  },
};
