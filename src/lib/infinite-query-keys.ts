export const infiniteQueryKeys = {
  /** Builds the cache key for a borrower search and attention filter. */
  borrowers(query: string, attention: string) {
    return ["borrowers", "infinite", { attention, query }] as const;
  },
  /** Builds the cache key for a date and collector payment filter. */
  dailyCollections(date: string, collectorId: string) {
    return ["payments", "daily", "infinite", { collectorId, date }] as const;
  },
  /** Builds the cache key for the main payment history. */
  payments() {
    return ["payments", "infinite"] as const;
  },
  /** Builds the cache key for loan attention filters. */
  loans(attention: string, asOf: string) {
    return ["loans", "infinite", { asOf, attention }] as const;
  },
  /** Builds the cache key for the collector directory. */
  collectors() {
    return ["collectors", "infinite"] as const;
  },
  /** Builds the cache key for dashboard loan search. */
  dashboardLoans(query: string) {
    return ["dashboard", "loans", "infinite", { query }] as const;
  },
  /** Builds the cache key for loans belonging to one borrower. */
  borrowerLoans(borrowerId: string, status: string) {
    return ["borrowers", borrowerId, "loans", "infinite", { status }] as const;
  },
};
