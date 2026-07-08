import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { normalizeSearchText } from "@/backend/services/search-text-service";
import { getPrimaryLender } from "./lender-service";

export type SmsRecipient = {
  id: string;
  name: string;
  businessName: string;
  phoneNumber: string;
};

const SEARCH_LIMIT = 8;
const ALL_BORROWERS_LIMIT = 5000;

export async function searchBorrowerSmsRecipients(
  query: string,
): Promise<SmsRecipient[]> {
  const lender = await getPrimaryLender();
  const normalizedQuery = normalizeSearchText(query);

  if (!lender || normalizedQuery.length < 2) {
    return [];
  }

  const borrowers = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    queries: [
      Query.equal("lender_id", lender.id),
      Query.or([
        Query.search("name", normalizedQuery),
        Query.search("business_name", normalizedQuery),
        Query.search("contact", normalizedQuery),
      ]),
      Query.limit(SEARCH_LIMIT),
      Query.select(["$id", "name", "business_name", "contact"]),
    ],
  });

  return borrowers.documents
    .map((borrower) => mapBorrowerToRecipient(borrower))
    .filter((recipient) => recipient.phoneNumber);
}

export async function getAllBorrowerSmsRecipients(): Promise<SmsRecipient[]> {
  const lender = await getPrimaryLender();

  if (!lender) {
    return [];
  }

  const borrowers = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    queries: [
      Query.equal("lender_id", lender.id),
      Query.limit(ALL_BORROWERS_LIMIT),
      Query.select(["$id", "name", "business_name", "contact"]),
    ],
  });

  return borrowers.documents
    .map((borrower) => mapBorrowerToRecipient(borrower))
    .filter((recipient) => recipient.phoneNumber);
}

function mapBorrowerToRecipient(
  borrower: Record<string, unknown> & { $id: string },
): SmsRecipient {
  return {
    id: borrower.$id,
    name: String(borrower.name ?? ""),
    businessName: String(borrower.business_name ?? ""),
    phoneNumber: String(borrower.contact ?? ""),
  };
}
