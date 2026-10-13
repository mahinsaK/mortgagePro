import { describe, expect, it } from "vitest";
import { infiniteQueryKeys } from "../infinite-query-keys";

describe("infinite query keys", () => {
  it("keeps borrower searches in separate caches", () => {
    expect(infiniteQueryKeys.borrowers("alice", "")).not.toEqual(
      infiniteQueryKeys.borrowers("bob", ""),
    );
  });

  it("keeps daily collection filters in separate caches", () => {
    expect(infiniteQueryKeys.dailyCollections("2026-10-13", "collector_a"))
      .not.toEqual(
        infiniteQueryKeys.dailyCollections("2026-10-13", "collector_b"),
      );
  });
});
