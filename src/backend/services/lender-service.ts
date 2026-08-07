import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { normalizeCurrency } from "@/backend/lib/currency";
import {
  AuthenticationServiceUnavailableError,
  resolveAppwriteSession,
} from "@/backend/services/auth-session-service";

export type LenderProfile = {
  id: string;
  appwriteUserId: string;
  companyName: string;
  email: string;
  contactInfo: string;
  status: string;
  currency: string;
};

export type LenderAuthResolution =
  | { status: "anonymous" }
  | { status: "invalid" }
  | { status: "inactive" }
  | { status: "unavailable" }
  | { status: "authenticated"; lender: LenderProfile };

export async function resolvePrimaryLender(): Promise<LenderAuthResolution> {
  const session = await resolveAppwriteSession();

  if (session.status !== "authenticated") {
    return session;
  }

  if (!appwriteServerConfig.apiKey) {
    return { status: "unavailable" };
  }

  let lenders;

  try {
    lenders = await databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.lenders,
      queries: [
        Query.equal("appwrite_user_id", session.user.$id),
        Query.limit(1),
      ],
    });
  } catch {
    return { status: "unavailable" };
  }

  const lender = lenders.documents[0];

  if (!lender || String(lender.status ?? "") !== "active") {
    return { status: "inactive" };
  }

  return {
    status: "authenticated",
    lender: {
      id: lender.$id,
      appwriteUserId: String(lender.appwrite_user_id ?? ""),
      companyName: String(lender.company_name ?? "MortgagePro"),
      email: String(lender.email ?? ""),
      contactInfo: String(lender.contact_info ?? ""),
      status: String(lender.status ?? "active"),
      currency: normalizeCurrency(String(lender.currency ?? "")),
    },
  };
}

export async function getPrimaryLender(): Promise<LenderProfile | null> {
  const result = await resolvePrimaryLender();

  if (result.status === "authenticated") {
    return result.lender;
  }

  if (result.status === "unavailable") {
    throw new AuthenticationServiceUnavailableError();
  }

  return null;
}

export async function getLenderCurrencyById(lenderId: string) {
  const lender = await databases.getDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.lenders,
    documentId: lenderId,
    queries: [Query.select(["currency"])],
  });

  return normalizeCurrency(String(lender.currency ?? ""));
}
