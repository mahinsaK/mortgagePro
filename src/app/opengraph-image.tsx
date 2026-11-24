import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0b2848",
          color: "#ffffff",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            MortgagePro
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "920px",
          }}
        >
          <div
            style={{
              fontSize: "60px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            Run daily lending and field collections from one ledger.
          </div>
          <div
            style={{
              fontSize: "26px",
              color: "#cbd5e1",
              lineHeight: 1.4,
            }}
          >
            Borrower records, mobile QR collection, atomic repayment guards, and
            SMS notifications in one tenant isolated portal.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "20px",
            color: "#9ed2ff",
          }}
        >
          <span>Server only isolation</span>
          <span>Mobile QR scanner</span>
          <span>Atomic balance updates</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
