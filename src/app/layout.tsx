import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Personal Portfolio",
    template: "%s | Personal Portfolio",
  },
  description: "A carefully curated personal portfolio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
