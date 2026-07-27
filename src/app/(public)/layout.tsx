import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { PublicFaultyTerminalBackground } from "@/components/public/faulty-terminal";
import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable} public-site dark relative isolate min-h-screen overflow-x-clip`}
    >
      <PublicFaultyTerminalBackground />
      <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="public-content-panel relative isolate mx-auto w-full max-w-[1440px] overflow-hidden rounded-[20px] border sm:rounded-[28px]">
          <div
            aria-hidden="true"
            className="public-content-panel-backdrop pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
          />
          <div className="public-content-frame relative z-10 flex flex-col">
            <PublicHeader />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
const bodyFont = Geist({
  subsets: ["latin"],
  variable: "--font-public-body",
});

const monoFont = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-public-mono",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-public-display",
});
