export const infiniteQueryKeys = {
  borrowers(query: string, attention: string) {
    return ["borrowers", "infinite", { attention, query }] as const;
  },
  dailyCollections(date: string, collectorId: string) {
    return ["payments", "daily", "infinite", { collectorId, date }] as const;
  },
};
