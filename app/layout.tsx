import { GoogleTagManager } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zarbill.com"),
  title: {
    default: "Zarbill — Tax-ready invoicing for freelancers",
    template: "%s · Zarbill",
  },
  description:
    "Create professional, tax-ready invoices in under a minute. Send them to clients, track who has paid, and bill in any major currency. Free to start.",
  applicationName: "Zarbill",
  openGraph: {
    type: "website",
    url: "https://zarbill.com",
    siteName: "Zarbill",
    title: "Zarbill — Tax-ready invoicing for freelancers",
    description: "Tax-ready invoices in under a minute. Track who has paid. Free to start.",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <GoogleTagManager gtmId="AW-18449412545" />
      </body>
    </html>
  );
}
