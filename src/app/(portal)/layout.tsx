import { PortalShell } from "@/frontend/components/layout/portal-shell";
import { getPrimaryLender } from "@/backend/services/lender-service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lender = await getPrimaryLender();

  if (!lender) {
    redirect("/auth/login");
  }

  return (
    <PortalShell lender={lender}>{children}</PortalShell>
  );
}
