import type { Metadata } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/frontend/components/ui/navigation-progress";
import "@/frontend/styles/globals.css";
import "@/frontend/styles/theme.css";

export const metadata: Metadata = {
  title: "MortgagePro",
  description: "Lender business management dashboard",
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
