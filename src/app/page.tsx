import Link from "next/link";
import { redirect } from "next/navigation";
import { dexEntries, progress, today, visibleDexes } from "@/lib/dexes";
import { getPokemon } from "@/lib/data";
import { getDict, getProfile } from "@/lib/session";
import { byDex, getTicks } from "@/lib/ticks";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const [{ lang, t }, all, ticks] = await Promise.all([getDict(), getPokemon(), getTicks()]);
  const day = today();
  const ticksBy = byDex(ticks);
  const dexes = visibleDexes(profile.visible_dexes);

  const tiles = (allForms: boolean) =>
    dexes
      .filter((d) => !(allForms && d.everyRow))
      .map((d) => {
        const { done, total } = progress(dexEntries(all, d, allForms, day), d, ticksBy.get(d.key) ?? new Map(), day);
        const pct = total ? Math.round((done / total) * 100) : 0;
        return (
          <Link key={d.key} href={`/dex/${d.key}${allForms ? "?forms=all" : ""}`} className="dex-tile">
            <div className="name">{d.name[lang]}</div>
            <div className="count">{done} / {total} · {pct}%</div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          </Link>
        );
      });

  return (
    <>
      <h1>{t.dexes}</h1>
      {profile.all_forms && <div className="section-label">{t.inGame}</div>}
      <div className="dex-list">{tiles(false)}</div>
      {profile.all_forms && (
        <>
          <div className="section-label">{t.allForms}</div>
          <div className="dex-list">{tiles(true)}</div>
        </>
      )}
    </>
  );
}
