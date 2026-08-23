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
    default: "Zarbill — Tax-ready invoicing for South African freelancers",
    template: "%s · Zarbill",
  },
  description:
    "Create SARS-ready tax invoices in under a minute. EFT-first, priced in rands, built for South African freelancers. Free to start.",
  applicationName: "Zarbill",
  openGraph: {
    type: "website",
    url: "https://zarbill.com",
    siteName: "Zarbill",
    title: "Zarbill — Tax-ready invoicing for South African freelancers",
    description: "SARS-ready tax invoices, EFT-first, in rands. Free to start.",
    locale: "en_ZA",
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
      lang="en-ZA"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
