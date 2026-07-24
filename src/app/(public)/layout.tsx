import { Manrope } from "next/font/google";
import { PublicHeader } from "@/components/public/public-header";

const publicFont = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-public-manrope",
  display: "swap",
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${publicFont.variable} public-site flex min-h-screen flex-col`}
    >
      <PublicHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
