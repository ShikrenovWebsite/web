import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ThemeProvider,
  type ThemePreference,
} from "@/components/theme/theme-provider";
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

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("portfolio-theme");
    const theme = stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : (document.documentElement.dataset.theme || "system");
    const dark = theme === "dark" ||
      (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
  } catch {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get("portfolio-theme")?.value;
  const initialPreference: ThemePreference =
    storedTheme === "light" ||
    storedTheme === "dark" ||
    storedTheme === "system"
      ? storedTheme
      : "system";

  return (
    <html
      data-scroll-behavior="smooth"
      data-theme={initialPreference}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider initialPreference={initialPreference}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
