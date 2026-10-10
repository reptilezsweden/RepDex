import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getDict, getProfile } from "@/lib/session";
import { ServiceWorker } from "./sw-register";

export const metadata: Metadata = {
  title: "RepDex",
  description: "Track your Pokémon GO collection across every dex.",
  appleWebApp: { capable: true, title: "RepDex", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#d6402f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ lang, t }, profile] = await Promise.all([getDict(), getProfile()]);
  return (
    <html lang={lang}>
      <body>
        {profile && (
          <header className="topbar">
            <Link href="/" className="brand">Rep<span>Dex</span></Link>
            <nav>
              <Link href="/">{t.dexes}</Link>
              <Link href="/settings">{t.settings}</Link>
            </nav>
          </header>
        )}
        <main>{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
