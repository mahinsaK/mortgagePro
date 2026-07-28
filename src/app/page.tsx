import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { userAgentFromString } from "next/server";
import { requireActiveCollectorPrincipal } from "@/backend/services/collector-auth-service";
import { resolvePrimaryLender } from "@/backend/services/lender-service";

export const dynamic = "force-dynamic";

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

  if (lenderAuth.status === "unavailable") {
    redirect("/auth/unavailable");
  }

  redirect(prefersCollectorLogin ? "/collector/login" : "/auth/login");
}
