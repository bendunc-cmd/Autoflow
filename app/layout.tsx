import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoFlow AI — Smart Automation for Small Business",
  description:
    "Automate your business workflows with AI. Built for Australian small businesses. Save hours every week with intelligent automation.",
  openGraph: {
    title: "AutoFlow AI — Smart Automation for Small Business",
    description:
      "Automate your business workflows with AI. Built for Australian small businesses.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
