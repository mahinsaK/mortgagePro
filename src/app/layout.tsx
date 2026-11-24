import type { Metadata } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import "@/styles/globals.css";
import "@/styles/theme.css";

function resolveMetadataBase() {
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // Fall back to local origin when APP_BASE_URL is unset or malformed.
    }
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "MortgagePro | Lending Operations and QR Field Collections",
    template: "%s",
  },
  description:
    "Manage borrowers, loans, daily QR field collections, and borrower SMS notifications in one tenant isolated lending portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
