import { describe, expect, it } from "vitest";
import { createLoanSearchText, normalizeSearchText } from "../search-text-service";

describe("search-text-service", () => {
  it("indexes borrower name, address, phone, and middle fragments", () => {
    const searchText = createLoanSearchText({
      borrowerName: "Avery Johnson",
      borrowerContact: "+1 555 0101",
      borrowerAddress: "22 Cedar Road",
    });

    expect(searchText).toContain("avery");
    expect(searchText).toContain("ver");
    expect(searchText).toContain("ohn");
    expect(searchText).toContain("555");
    expect(searchText).toContain("0101");
    expect(searchText).toContain("cedar");
  });

  it("normalizes punctuation for database search queries", () => {
    expect(normalizeSearchText("+1 (555) 0101")).toBe("1 555 0101");
  });
});
