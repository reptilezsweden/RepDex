import Link from "next/link";
import { redirect } from "next/navigation";
import { MonImage } from "@/components/mon-ui";
import { displayName, today, upcomingReleases } from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Start page: links to the app's sections, then the upcoming releases. */
export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const [{ lang, t }, all] = await Promise.all([getDict(), getPokemon()]);
  const upcoming = upcomingReleases(all, today());
  const fmt = new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <nav className="start-links" aria-label={t.appName}>
        <Link href="/dexes" className="start-link">{t.dexes}</Link>
        <span className="start-link disabled" aria-disabled="true" title={t.comingSoon}>
          {t.wishlists}<small>{t.comingSoon}</small>
        </span>
      </nav>

      <h1 className="section-title">{t.upcomingReleases}</h1>
      {upcoming.length === 0 ? (
        <p className="empty">{t.noUpcoming}</p>
      ) : (
        upcoming.map((g) => (
          <section key={g.date} className="upcoming">
            <h3>{fmt.format(new Date(`${g.date}T00:00:00Z`))}</h3>
            <ul>
              {g.items.map(({ pokemon: p, type, withShiny }) => {
                const shiny = type.endsWith("shiny");
                return (
                  <li key={`${p.id}-${type}`}>
                    <Link href={`/pokemon/${p.species}`}>
                      <MonImage file={shiny ? p.image_shiny : p.image_regular} size={48} />
                      {withShiny && <MonImage file={p.image_shiny} size={48} />}
                      <span className="nm">{displayName(p)}</span>
                      <span className="type">{t.releaseType[type]}{withShiny ? ` + ${t.plusShiny}` : ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
