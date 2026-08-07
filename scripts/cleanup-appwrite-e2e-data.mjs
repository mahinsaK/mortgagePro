import { createE2EContext, e2eIds } from "./lib/e2e-appwrite.mjs";

const { config, databases, users } = createE2EContext();

await cleanup();
console.log("Dedicated E2E records removed.");

async function cleanup() {
  for (const [collectionName, ids] of [
    ["smsSendLogs", e2eIds.smsSendLogs],
    ["smsMonthlyUsage", e2eIds.smsMonthlyUsage],
    ["smsTemplates", e2eIds.smsTemplates],
    ["smsSenderRequests", e2eIds.smsSenderRequests],
    ["smsAccounts", e2eIds.smsAccounts],
    ["payments", e2eIds.payments],
    ["loans", e2eIds.loans],
    ["borrowers", e2eIds.borrowers],
    ["collectors", e2eIds.collectors],
    ["lenders", e2eIds.lenders],
  ]) {
    for (const documentId of ids) {
      await ignoreNotFound(() =>
        databases.deleteDocument({
          databaseId: config.databaseId,
          collectionId: config.collections[collectionName],
          documentId,
        }),
      );
    }
  }

  for (const userId of e2eIds.users) {
    await ignoreNotFound(() => users.delete({ userId }));
  }
}

async function ignoreNotFound(operation) {
  try {
    await operation();
  } catch (error) {
    if (error?.code !== 404) {
      throw error;
    }
  }
}
