import { Manrope } from "next/font/google";
import { PublicFaultyTerminalBackground } from "@/components/public/faulty-terminal";
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
      className={`${publicFont.variable} public-site relative isolate min-h-screen overflow-x-clip`}
    >
      <PublicFaultyTerminalBackground />
      <div className="relative z-10 px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
        <div className="public-content-panel relative isolate mx-auto w-full max-w-[1200px] rounded-[20px] border sm:rounded-[26px]">
          <div
            aria-hidden="true"
            className="public-content-panel-backdrop pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-gradient-to-b from-white/[0.025] to-transparent"
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
