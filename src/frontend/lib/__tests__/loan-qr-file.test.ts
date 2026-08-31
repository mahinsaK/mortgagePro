import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLoanQrPng, getLoanQrDataUrl } from "../loan-qr-file";

const VALID_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

describe("loan QR file validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a successful PNG response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(VALID_PNG, {
          headers: { "content-type": "image/png" },
          status: 200,
        }),
      ),
    );

    const blob = await fetchLoanQrPng("/api/loans/loan_A/qr");

    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(VALID_PNG.length);
  });

  it("generates and caches a PNG data URL for the loan identifier", async () => {
    const firstRequest = getLoanQrDataUrl("loan_A");
    const secondRequest = getLoanQrDataUrl("loan_A");

    expect(secondRequest).toBe(firstRequest);
    await expect(firstRequest).resolves.toMatch(/^data:image\/png;base64,/);
    const blob = await fetchLoanQrPng(await firstRequest);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(8);
  });

  it("rejects an unsuccessful response before saving it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Loan not found.", { status: 404 })),
    );

    await expect(fetchLoanQrPng("/api/loans/missing/qr")).rejects.toThrow(
      "The QR image request failed.",
    );
  });

  it("rejects a non-PNG response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Server error", {
          headers: { "content-type": "text/html" },
          status: 200,
        }),
      ),
    );

    await expect(fetchLoanQrPng("/api/loans/loan_A/qr")).rejects.toThrow(
      "The QR download was not a PNG image.",
    );
  });

  it("rejects invalid bytes labelled as a PNG", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), {
          headers: { "content-type": "image/png" },
          status: 200,
        }),
      ),
    );

    await expect(fetchLoanQrPng("/api/loans/loan_A/qr")).rejects.toThrow(
      "The QR download contained invalid image data.",
    );
  });
});
