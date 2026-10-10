import Link from "next/link";
import { redirect } from "next/navigation";
import { MonImage, StarIcon } from "@/components/mon-ui";
import { dexEntries, displayName, progress, shinyToggles, today, upcomingReleases, visibleDexes, type Dex, type Pokemon, type Tick } from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { byDex, getTicks } from "@/lib/ticks";

export const dynamic = "force-dynamic";

function Progress({ all, dex, allForms, ticks, day }: { all: Pokemon[]; dex: Dex; allForms: boolean; ticks: Map<string, Tick>; day: string }) {
  const { done, total } = progress(dexEntries(all, dex, allForms, day), dex, ticks, day);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <>
      <div className="count">{done} / {total} · {pct}%</div>
      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
    </>
  );
}

/** Small counter for a shiny dex shown inside its regular dex's box. */
function ShinyProgress({ all, dex, kind, allForms, ticks, day, label }: {
  all: Pokemon[]; dex: Dex; kind: "star" | "star3"; allForms: boolean; ticks: Map<string, Tick>; day: string; label: string;
}) {
  const { done, total } = progress(dexEntries(all, dex, allForms, day), dex, ticks, day);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <>
      <div className="mini" aria-label={label}><StarIcon kind={kind} size={16} />{done} / {total} · {pct}%</div>
      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
    </>
  );
}

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const [{ lang, t }, all, ticks] = await Promise.all([getDict(), getPokemon(), getTicks()]);
  const day = today();
  const ticksBy = byDex(ticks);
  const upcoming = upcomingReleases(all, day);
  const fmt = new Intl.DateTimeFormat(lang === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <h1>{t.dexes}</h1>
      <div className="dex-list">
        {visibleDexes(profile.visible_dexes).map((d) => {
          const dt = ticksBy.get(d.key) ?? new Map<string, Tick>();
          const stars = shinyToggles(d, profile.visible_dexes);
          const starLines = (allForms: boolean) =>
            stars
              .filter((s) => !(allForms && s.dex.everyRow))
              .map((s) => (
                <ShinyProgress
                  key={s.dex.key} all={all} dex={s.dex} kind={s.kind} allForms={allForms}
                  ticks={ticksBy.get(s.dex.key) ?? new Map<string, Tick>()} day={day} label={s.dex.name[lang]}
                />
              ));
          return (
            <div key={d.key} className="dex-tile">
              <Link href={`/dex/${d.key}`} className="tile-main">
                <div className="name">{d.name[lang]}</div>
                <Progress all={all} dex={d} allForms={false} ticks={dt} day={day} />
                {starLines(false)}
              </Link>
              {profile.all_forms && !d.everyRow && (
                <Link href={`/dex/${d.key}?forms=all`} className="tile-forms">
                  <div className="sub">{t.allForms}</div>
                  <Progress all={all} dex={d} allForms ticks={dt} day={day} />
                  {starLines(true)}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="section-title">{t.upcomingReleases}</h2>
      {upcoming.length === 0 ? (
        <p className="empty">{t.noUpcoming}</p>
      ) : (
        upcoming.map((g) => (
          <section key={g.date} className="upcoming">
            <h3>{fmt.format(new Date(`${g.date}T00:00:00Z`))}</h3>
            <ul>
              {g.items.map(({ pokemon: p, type }) => {
                const shiny = type.endsWith("shiny");
                return (
                  <li key={`${p.id}-${type}`}>
                    <Link href={`/pokemon/${p.species}`}>
                      <MonImage file={shiny ? p.image_shiny : p.image_regular} size={48} />
                      <span className="nm">{displayName(p)}</span>
                      <span className="type">{t.releaseType[type]}</span>
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
