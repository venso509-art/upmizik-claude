import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/footer/Footer";
import { SettingsProvider } from "@/components/SettingsProvider";
import { getSettings } from "@/lib/settings-server";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { PlayerBar } from "@/components/player/PlayerBar";
import { ServiceWorkerRegister } from "@/components/offline/ServiceWorkerRegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "UpMizik",
  description: "Koute epi pataje mizik.",
  appleWebApp: { capable: true, title: "UpMizik", statusBarStyle: "black-translucent" },
  icons: { apple: "/pwa-icon/192" },
};

export const viewport: Viewport = { themeColor: "#09090b" };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Paramèt peman yo (to, nimewo MonCash/NatCash, frè...) pou tout konpozan navigatè yo
  const settings = await getSettings();

  return (
    <html lang="ht">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}
      >
        <SettingsProvider settings={settings}>
          <PlayerProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <PlayerBar />
            <ServiceWorkerRegister />
          </PlayerProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
