import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import Navigation from "@/components/Navigation";
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
  title: "ChargeSure - Predictive EV Mobility for India",
  description:
    "ChargeSure replaces static charger maps with intelligent routing, charger trust scores, grid-aware charging windows, and backup-aware route planning so EV riders never face range anxiety.",
  keywords: [
    "EV charging",
    "electric vehicle",
    "India",
    "route planning",
    "charger map",
    "fleet management",
    "CPO",
    "DISCOM",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col h-full antialiased`}
      >
        <Providers>
          {/*
            Next.js app/error.tsx serves as the React Error Boundary.
            Navigation wraps children so the sidebar + header remain
            visible even on sub-page errors; the error boundary catches
            only the <main> content exceptions.
          */}
          <Navigation>{children}</Navigation>
        </Providers>
      </body>
    </html>
  );
}
