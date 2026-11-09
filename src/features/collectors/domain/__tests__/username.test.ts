import { describe, expect, it } from "vitest";
import {
  generateCollectorUsername,
  normalizeCollectorUsernameDraft,
  validateNewCollectorUsername,
} from "../username";

describe("collector usernames", () => {
  it("generates a compact username from the collector name", () => {
    expect(generateCollectorUsername("Jordan Lee", "4821")).toBe("jordanlee4821");
    expect(generateCollectorUsername("José Álvarez", "0042")).toBe("josealvarez0042");
  });

  it("uses a safe fallback for numeric, non-Latin, or empty names", () => {
    expect(generateCollectorUsername("12345", "4821")).toBe("collector4821");
    expect(generateCollectorUsername("ජයසිංහ", "4821")).toBe("collector4821");
    expect(generateCollectorUsername("", "4821")).toBe("collector4821");
  });

  it("keeps generated usernames within Appwrite's document ID limit", () => {
    const username = generateCollectorUsername("A very long collector name repeated forever", "4821");

    expect(username).toHaveLength(36);
    expect(username.endsWith("4821")).toBe(true);
  });

  it("normalizes interactive drafts without weakening server validation", () => {
    expect(normalizeCollectorUsernameDraft(" Jordan.Lee-4821 ")).toBe("jordanlee4821");
    expect(validateNewCollectorUsername("JordanLee4821")).toMatch(/lowercase/);
    expect(validateNewCollectorUsername("jordan-lee4821")).toMatch(/lowercase/);
    expect(validateNewCollectorUsername("12345")).toMatch(/start/);
    expect(validateNewCollectorUsername("abcd")).toMatch(/5-36/);
    expect(validateNewCollectorUsername(`a${"1".repeat(36)}`)).toMatch(/5-36/);
    expect(validateNewCollectorUsername("jordanlee4821")).toBeNull();
  });
});
