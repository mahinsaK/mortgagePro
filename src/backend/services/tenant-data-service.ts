import type { Models } from "node-appwrite";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";

export type TenantCollection =
  | "borrowers"
  | "collectors"
  | "loans"
  | "payments"
  | "smsAccounts"
  | "smsSenderRequests"
  | "smsTemplates"
  | "smsMonthlyUsage"
  | "smsSendLogs";
export type TenantDocument = Models.Document & Record<string, unknown>;

export class TenantResourceNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super("Record not found.");
    this.name = "TenantResourceNotFoundError";
  }
}

export function listTenantDocuments(
  collection: TenantCollection,
  lenderId: string,
  queries: string[] = [],
) {
  return databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections[collection],
    queries: [Query.equal("lender_id", lenderId), ...queries],
  });
}

export async function getTenantDocument(
  collection: TenantCollection,
  lenderId: string,
  documentId: string,
  select: string[] = ["$id"],
): Promise<TenantDocument | null> {
  const result = await listTenantDocuments(collection, lenderId, [
    Query.equal("$id", documentId),
    Query.limit(1),
    Query.select(select),
  ]);

  return (result.documents[0] as TenantDocument | undefined) ?? null;
}

export async function requireTenantDocument(
  collection: TenantCollection,
  lenderId: string,
  documentId: string,
  select: string[] = ["$id"],
) {
  const document = await getTenantDocument(
    collection,
    lenderId,
    documentId,
    select,
  );

  if (!document) {
    throw new TenantResourceNotFoundError();
  }

  return document;
}

export function createTenantDocument(
  collection: TenantCollection,
  lenderId: string,
  documentId: string,
  data: Record<string, unknown>,
) {
  return databases.createDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections[collection],
    documentId,
    data: { ...data, lender_id: lenderId },
  });
}

export async function updateTenantDocument(
  collection: TenantCollection,
  lenderId: string,
  documentId: string,
  data: Record<string, unknown>,
) {
  await requireTenantDocument(collection, lenderId, documentId);
  const tenantSafeData = { ...data };
  delete tenantSafeData.lender_id;

  return databases.updateDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections[collection],
    documentId,
    data: tenantSafeData,
  });
}

export async function deleteTenantDocument(
  collection: TenantCollection,
  lenderId: string,
  documentId: string,
) {
  await requireTenantDocument(collection, lenderId, documentId);

  return databases.deleteDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections[collection],
    documentId,
  });
}
