import { PortalShell } from "@/frontend/components/layout/portal-shell";
import { QueryProvider } from "@/frontend/components/providers/query-provider";
import { resolvePrimaryLender } from "@/backend/services/lender-service";
import { createNotificationOwnerKey } from "@/backend/services/local-notification-service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Protects lender portal routes and provides their client-side query cache. */
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
    <QueryProvider>
      <PortalShell
        lender={auth.lender}
        notificationOwnerKey={createNotificationOwnerKey(auth.lender.id)}
      >
        {children}
      </PortalShell>
    </QueryProvider>
  );
}
