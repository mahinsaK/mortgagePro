import { PortalShell } from "@/frontend/components/layout/portal-shell";
import { resolvePrimaryLender } from "@/backend/services/lender-service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await resolvePrimaryLender();

  if (auth.status === "invalid" || auth.status === "inactive") {
    redirect("/auth/session/clear");
  }

  if (auth.status === "unavailable") {
    redirect("/auth/unavailable");
  }

  if (auth.status === "anonymous") {
    redirect("/auth/login");
  }

  return (
    <PortalShell lender={auth.lender}>{children}</PortalShell>
  );
}
