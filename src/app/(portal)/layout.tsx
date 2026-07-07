import { PortalShell } from "@/frontend/components/layout/portal-shell";
import { getPrimaryLender } from "@/backend/services/lender-service";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lender = await getPrimaryLender();

  return (
    <PortalShell lender={lender}>{children}</PortalShell>
  );
}
