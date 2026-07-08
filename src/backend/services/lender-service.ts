import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { normalizeCurrency } from "@/backend/lib/currency";
import { getCurrentAppwriteUser } from "@/backend/services/auth-session-service";

export type LenderProfile = {
  id: string;
  appwriteUserId: string;
  companyName: string;
  email: string;
  contactInfo: string;
  status: string;
  currency: string;
};

export async function getPrimaryLender(): Promise<LenderProfile | null> {
  if (!appwriteServerConfig.apiKey) {
    return null;
  }

  const user = await getCurrentAppwriteUser();

  if (!user) {
    return null;
  }

  const lenders = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.lenders,
    queries: [
      Query.equal("appwrite_user_id", user.$id),
      Query.equal("status", "active"),
      Query.limit(1),
    ],
  });

  const lender = lenders.documents[0];

  if (!lender) {
    return null;
  }

  return {
    id: lender.$id,
    appwriteUserId: String(lender.appwrite_user_id ?? ""),
    companyName: String(lender.company_name ?? "MortgagePro"),
    email: String(lender.email ?? ""),
    contactInfo: String(lender.contact_info ?? ""),
    status: String(lender.status ?? "active"),
    currency: normalizeCurrency(String(lender.currency ?? "")),
  };
}
