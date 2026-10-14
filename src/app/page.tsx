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
        <Link href="/wishlists" className="start-link">{t.wishlists}</Link>
      </nav>

      <h1 className="section-title">{t.upcomingReleases}</h1>
      {upcoming.length === 0 ? (
        <p className="empty">{t.noUpcoming}</p>
      ) : (
        upcoming.map((g) => (
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
        ))
      )}
    </>
  );
}
