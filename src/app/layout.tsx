import type { Metadata, Viewport } from "next";
import { Fredoka, Geist_Mono, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const fredoka = Fredoka({
  variable: "--font-latin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

const notoSC = Noto_Sans_SC({
  variable: "--font-zh",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoJP = Noto_Sans_JP({
  variable: "--font-ja",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoKR = Noto_Sans_KR({
  variable: "--font-ko",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "linguaflow · Sprachlernen, das bleibt",
  description: "Gamifiziertes Sprachtraining mit persönlichem Voice Coach.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00A3FF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${fredoka.variable} ${geistMono.variable} ${notoThai.variable} ${notoSC.variable} ${notoJP.variable} ${notoKR.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
