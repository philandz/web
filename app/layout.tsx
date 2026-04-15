import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

export const metadata: Metadata = {
  title: "Philandz",
  description: "Personal finance web app for Philandz",
  icons: {
    icon: "/philand.png",
    shortcut: "/philand.png",
    apple: "/philand.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const localeCookie = cookies().get("NEXT_LOCALE")?.value;
  const htmlLang = localeCookie === "vi" ? "vi" : "en";

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
