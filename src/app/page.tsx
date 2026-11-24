import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { userAgentFromString } from "next/server";
import { LandingPage } from "@/features/marketing/components/landing-page";
import { requireActiveCollectorPrincipal } from "@/server/services/collector-auth-service";
import { resolvePrimaryLender } from "@/server/services/lender-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MortgagePro | Lending Operations and QR Field Collections",
  description:
    "Run daily lending, borrower records, mobile QR field collections, and TextLK SMS notifications from one tenant isolated ledger.",
  openGraph: {
    title: "MortgagePro | Lending Operations and QR Field Collections",
    description:
      "Run daily lending, borrower records, mobile QR field collections, and TextLK SMS notifications from one tenant isolated ledger.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MortgagePro | Lending Operations and QR Field Collections",
    description:
      "Manage borrowers, loans, mobile QR field collections, and borrower SMS notifications from one verified ledger.",
  },
};

export default async function Home() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const deviceType = userAgentFromString(userAgent).device.type;
  const prefersCollectorLogin =
    deviceType === "mobile" || deviceType === "tablet";

  if (prefersCollectorLogin) {
    const collector = await requireActiveCollectorPrincipal();

    if (collector) {
      redirect("/collector/scan");
    }
  }

  const lenderAuth = await resolvePrimaryLender();

  if (lenderAuth.status === "authenticated") {
    redirect("/dashboard/lender");
  }

  if (lenderAuth.status === "invalid" || lenderAuth.status === "inactive") {
    redirect("/auth/session/clear");
  }

  return <LandingPage />;
}
