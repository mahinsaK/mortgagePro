import type { Metadata } from "next";
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
