import { describe, expect, it } from "vitest";
import { escapeCsvCell } from "./csv";

describe("escapeCsvCell", () => {
  it("quotes text and escapes embedded quotes", () => {
    expect(escapeCsvCell('Jordan "Jay" Lee')).toBe('"Jordan ""Jay"" Lee"');
  });

  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1:A2)", "\tformula", "\rformula"])(
    "neutralizes spreadsheet formula prefix %j",
    (value) => {
      expect(escapeCsvCell(value)).toBe(`"'${value}"`);
    },
  );

  it("does not alter ordinary values", () => {
    expect(escapeCsvCell("Amal Perera")).toBe('"Amal Perera"');
  });
});
