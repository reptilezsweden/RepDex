import Link from "next/link";
import { MonImage } from "@/components/mon-ui";
import { displayName, recentReleases, today, upcomingReleases, type Upcoming } from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { adminPending } from "@/lib/admin";
import { getDict, getProfile } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Start page: links to the app's sections, then the upcoming releases. */
export default async function Home() {
  const [{ lang, t }, all, profile] = await Promise.all([getDict(), getPokemon(), getProfile()]);
  const pending = profile?.role === "admin" ? Object.values(await adminPending()).reduce((a, b) => a + b, 0) : 0;
  const day = today();
  const upcoming = upcomingReleases(all, day);
  const recent = recentReleases(all, day, 7);
  const fmt = new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <nav className="start-links" aria-label={t.appName}>
        {profile ? (
          <>
            <Link href="/dexes" className="start-link">{t.dexes}</Link>
            <Link href="/wishlists" className="start-link">{t.wishlists}</Link>
          </>
        ) : (
          // Signed-out visitors see what's there, locked.
          <>
            <span className="start-link disabled" title={t.signInToUse} aria-disabled="true">{t.dexes} <Padlock /></span>
            <span className="start-link disabled" title={t.signInToUse} aria-disabled="true">{t.wishlists} <Padlock /></span>
          </>
        )}
        <Link href="/events" className="start-link">{t.events}</Link>
        {profile?.role === "admin" && (
          <Link href="/admin" className="start-link">
            <span>{t.admin}{pending > 0 && <span className="pending-badge" title={t.adminPending}>{pending}</span>}</span>
          </Link>
        )}
      </nav>

      <h1 className="section-title">{t.recentReleases}</h1>
      {recent.length === 0 ? <p className="empty">{t.noRecent}</p> : <ReleaseList groups={recent} fmt={fmt} t={t} />}

      <h1 className="section-title">{t.upcomingReleases}</h1>
      {upcoming.length === 0 ? <p className="empty">{t.noUpcoming}</p> : <ReleaseList groups={upcoming} fmt={fmt} t={t} />}
    </>
  );
}

/** Releases grouped by date: one box per Pokémon (forms and shiny released together share a box). */
function ReleaseList({ groups, fmt, t }: { groups: Upcoming[]; fmt: Intl.DateTimeFormat; t: Awaited<ReturnType<typeof getDict>>["t"] }) {
  return groups.map((g) => (
    <section key={g.date} className="upcoming">
      <h3>{fmt.format(new Date(`${g.date}T00:00:00Z`))}</h3>
      <ul>
        {g.items.map(({ pokemon: p, type, withShiny, forms }) => {
          const shiny = type.endsWith("shiny");
          // Every form's picture (regular and shiny when both come out); half size past two.
          const images = (forms ?? [p]).flatMap((f) =>
            withShiny ? [f.image_regular, f.image_shiny] : [shiny ? f.image_shiny : f.image_regular]);
          const size = images.length > 2 ? 24 : 48;
          return (
            <li key={`${p.id}-${type}`}>
              <Link href={`/pokemon/${p.species}`}>
                <span className={`imgs${images.length > 2 ? " small" : ""}`}>
                  {images.map((img, i) => <MonImage key={i} file={img} size={size} />)}
                </span>
                <span className="nm">
                  {forms ? p.name : displayName(p)}
                  {forms && <small className="forms">{t.nForms.replace("{n}", String(forms.length))}</small>}
                </span>
                <span className="type">
                  {t.releaseType[type]}
                  {withShiny && <><br />+ {t.plusShiny}</>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  ));
}

function Padlock() {
  return (
    <svg className="padlock" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}
