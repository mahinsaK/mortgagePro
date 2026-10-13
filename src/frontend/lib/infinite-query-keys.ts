export const infiniteQueryKeys = {
  /** Builds the cache key for a borrower search and attention filter. */
  borrowers(query: string, attention: string) {
    return ["borrowers", "infinite", { attention, query }] as const;
  },
  /** Builds the cache key for a date and collector payment filter. */
  dailyCollections(date: string, collectorId: string) {
    return ["payments", "daily", "infinite", { collectorId, date }] as const;
  },
};
