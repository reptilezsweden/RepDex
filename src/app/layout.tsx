import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getDict, getProfile } from "@/lib/session";
import { signOut } from "./auth-actions";
import { MenuButton } from "./menu-button";
import { ServiceWorker } from "./sw-register";

export const metadata: Metadata = {
  title: "RepDex",
  description: "Track your Pokémon GO collection across every dex.",
  appleWebApp: { capable: true, title: "RepDex", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#2f8f5b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ lang, t }, profile] = await Promise.all([getDict(), getProfile()]);
  const links = (
    <>
      {profile && <Link href="/dexes">{t.dexes}</Link>}
      {profile && <Link href="/wishlists">{t.wishlists}</Link>}
      <Link href="/events">{t.events}</Link>
      {profile && <Link href="/settings">{t.settings}</Link>}
      {profile ? (
        <form action={signOut}>
          <button type="submit" className="link-button">{t.signOut}</button>
        </form>
      ) : (
        <Link href="/login">{t.signIn}</Link>
      )}
    </>
  );
  return (
    <html lang={lang}>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">Rep<span>Dex</span><small className="beta">{t.betaVersion}</small></Link>
          {/* Wide screens: the links in a row. Narrow screens: the same links behind a ☰ button. */}
          <nav className="nav-wide">{links}</nav>
          <MenuButton label={t.menu}>{links}</MenuButton>
        </header>
        <main>{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
