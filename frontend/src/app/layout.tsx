import type { Metadata, Viewport } from "next";
import { Nunito, Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PepTalk",
  description: "Communicate with Julian using Peppa Pig clips",
  manifest: "/manifest.json",
  openGraph: {
    title: "PepTalk",
    description: "Communicate with Julian using Peppa Pig clips",
    url: "https://peppatalk.com",
    siteName: "PepTalk",
    images: [
      {
        url: "https://peppatalk.com/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "PepTalk logo",
      },
    ],
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PepTalk",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4FC3F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
