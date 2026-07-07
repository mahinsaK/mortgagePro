import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";

export type LenderProfile = {
  id: string;
  companyName: string;
  email: string;
  contactInfo: string;
  status: string;
};

export async function getPrimaryLender(): Promise<LenderProfile | null> {
  if (!appwriteServerConfig.apiKey) {
    return null;
  }

  const lenders = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.lenders,
    queries: [Query.limit(1)],
  });

  const lender = lenders.documents[0];

  if (!lender) {
    return null;
  }

  return {
    id: lender.$id,
    companyName: String(lender.company_name ?? "MortgagePro"),
    email: String(lender.email ?? ""),
    contactInfo: String(lender.contact_info ?? ""),
    status: String(lender.status ?? "active"),
  };
}
