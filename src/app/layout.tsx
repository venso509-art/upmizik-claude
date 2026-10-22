import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/footer/Footer";
import { SettingsProvider } from "@/components/SettingsProvider";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { NoZoom } from "@/components/NoZoom";
import { SPLASH_HEAD_SCRIPT } from "@/lib/splash";
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

// viewportFit "cover": ba navigasyon anba a respekte zòn bouton iPhone yo
// Sit la toujou adapte ak lajè telefòn nan, e li pa ka zoume (demann Venso)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B132B",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Paramèt peman yo (to, nimewo MonCash/NatCash, frè...) pou tout konpozan navigatè yo
  const settings = await getSettings();

  return (
    // suppressHydrationWarning: script splash la ka ajoute yon klas sou <html> anvan React chaje
    <html lang="ht" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_HEAD_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}
      >
        <SplashScreen />
        <NoZoom />
        <SettingsProvider settings={settings}>
          <PlayerProvider>
            {/* Anvlòp kontni an: anpeche paj la glise sou kote, SAN touche ba fixed yo anba a */}
            <div className="up-page">
              <Header />
              <main>{children}</main>
              <Footer />
            </div>
            <PlayerBar />
            <BottomNav />
            <ServiceWorkerRegister />
          </PlayerProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
