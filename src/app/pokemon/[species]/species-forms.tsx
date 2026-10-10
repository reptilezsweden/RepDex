"use client";

import Link from "next/link";
import { CheckButton, ShinySwap, StarButton, WantedButton } from "@/components/mon-ui";
import type { Status } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { useTicks, type TickChanges, type TickRow } from "@/lib/use-ticks";

export interface FormCard {
  id: string;
  name: string;
  formType: string;
  regular: string | null;
  shiny: string | null;
  status: Status;
  date: string | null;
  tickable: boolean;
  stars: { kind: "star" | "star3"; dex: string; label: string }[];
}

export function SpeciesForms({
  title, no, dexKey, dexName, backHref, forms, initialTicks, userId, t,
}: {
  title: string;
  no: number;
  dexKey: string;
  dexName: string;
  backHref: string;
  forms: FormCard[];
  initialTicks: TickRow[];
  userId: string;
  t: Dict;
}) {
  const { get, save, toggleWanted: toggleStarWanted, error } = useTicks(userId, initialTicks);

  function toggle(id: string, field: "collected" | "wanted") {
    const cur = get(dexKey, id);
    const changes: TickChanges = new Map();
    if (field === "collected") {
      changes.set(id, cur?.collected ? null : { collected: true, wanted: false });
      // Unticking the regular checkmark also unticks the shiny stars.
      if (cur?.collected) {
        const f = forms.find((x) => x.id === id);
        if (f) { setStar(f, "star", false); setStar(f, "star3", false); }
      }
    }
    else if (cur?.collected) changes.set(id, { collected: true, wanted: !cur.wanted });
    void save(dexKey, changes);
  }

  /**
   * Shiny rules: ticking any shiny also ticks the regular checkmark; ticking the 3-star also
   * ticks the single star; unticking the single star also unticks the 3-star.
   */
  function setStar(f: FormCard, kind: "star" | "star3", on: boolean) {
    const st = f.stars.find((x) => x.kind === kind);
    if (!st) return;
    const isOn = !!get(st.dex, f.id)?.collected;
    if (on) {
      if (!isOn) void save(st.dex, new Map([[f.id, { collected: true, wanted: false }]]));
      if (f.tickable && !get(dexKey, f.id)?.collected) void save(dexKey, new Map([[f.id, { collected: true, wanted: false }]]));
      if (kind === "star3") setStar(f, "star", true);
    } else {
      if (get(st.dex, f.id)) void save(st.dex, new Map([[f.id, null]]));
      if (kind === "star") setStar(f, "star3", false);
    }
  }
  const toggleStarOf = (f: FormCard, kind: "star" | "star3") => {
    const st = f.stars.find((x) => x.kind === kind);
    if (st) setStar(f, kind, !get(st.dex, f.id)?.collected);
  };

  // Released forms, then released costumes under their own heading (only when there are any),
  // then upcoming and unreleased forms.
  const isCostume = (f: FormCard) => f.formType === "Costume";
  const groups: { key: string; heading: string | null; match: (f: FormCard) => boolean }[] = [
    { key: "released", heading: null, match: (f) => f.status === "available" && !isCostume(f) },
    { key: "costumes", heading: t.costumes, match: (f) => f.status === "available" && isCostume(f) },
    { key: "upcoming", heading: t.upcomingReleases, match: (f) => f.status === "upcoming" },
    { key: "unreleased", heading: t.unreleased, match: (f) => f.status === "unreleased" },
  ];

  return (
    <>
      <p className="back"><Link href={backHref}>← {t.back}</Link></p>
      <div className="dex-head">
        <h1>{title}</h1>
        <span className="count">#{String(no).padStart(4, "0")} · {dexName}</span>
      </div>
      {error && <p className="msg error" role="alert">{t.errorGeneric}</p>}

      {groups.map(({ key, heading, match }) => {
        const list = forms.filter(match);
        if (list.length === 0) return null;
        return (
          <section key={key}>
            {heading && <h2 className="gen-title">{heading}</h2>}
            <div className="grid forms">
              {list.map((f) => {
                const s = get(dexKey, f.id);
                const cls = ["mon", f.status !== "available" ? f.status : s?.collected ? "collected" : ""].join(" ");
                return (
                  <div key={f.id} className={cls}>
                    {f.tickable && <CheckButton on={!!s?.collected} label={t.collect} onClick={() => toggle(f.id, "collected")} />}
                    {f.tickable && s?.collected && (
                      <WantedButton on={!!s.wanted} label={t.wanted} onClick={() => toggle(f.id, "wanted")} />
                    )}
                    <ShinySwap regular={f.regular} shiny={f.shiny} label={t.showShiny} />
                    <span className="nm">{f.name}</span>
                    <span className="tag">{f.formType}</span>
                    {f.status === "upcoming" && <span className="tag up">{f.date}</span>}
                    {f.stars.length > 0 && (
                      <span className="extras">
                        {f.stars.map((st) => (
                          <span key={st.dex} className="star-pair">
                            {st.kind === "star" && get(st.dex, f.id)?.collected && (
                              <WantedButton
                                inline on={!!get(st.dex, f.id)?.wanted} label={`${t.wanted}: ${st.label}`}
                                onClick={() => toggleStarWanted(st.dex, [f.id])}
                              />
                            )}
                            <StarButton kind={st.kind} label={st.label} on={!!get(st.dex, f.id)?.collected} onClick={() => toggleStarOf(f, st.kind)} />
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
