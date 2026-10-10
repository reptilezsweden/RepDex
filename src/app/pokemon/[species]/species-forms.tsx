"use client";

import Link from "next/link";
import { CheckButton, ShinySwap, WantedButton } from "@/components/mon-ui";
import type { Status } from "@/lib/dexes";
import type { Dict } from "@/lib/i18n";
import { useTicks, type TickChanges, type TickState } from "@/lib/use-ticks";

export interface FormCard {
  id: string;
  name: string;
  formType: string;
  regular: string | null;
  shiny: string | null;
  status: Status;
  date: string | null;
  tickable: boolean;
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
  initialTicks: ({ pokemon_id: string } & TickState)[];
  userId: string;
  t: Dict;
}) {
  const { ticks, save, error } = useTicks(dexKey, userId, initialTicks);

  function toggle(id: string, field: "collected" | "wanted") {
    const cur = ticks.get(id);
    const changes: TickChanges = new Map();
    if (field === "collected") changes.set(id, cur?.collected ? null : { collected: true, wanted: false });
    else if (cur?.collected) changes.set(id, { collected: true, wanted: !cur.wanted });
    void save(changes);
  }

  const groups: { status: Status; heading: string | null }[] = [
    { status: "available", heading: null },
    { status: "upcoming", heading: t.upcomingReleases },
    { status: "unreleased", heading: t.unreleased },
  ];

  return (
    <>
      <p className="back"><Link href={backHref}>← {t.back}</Link></p>
      <div className="dex-head">
        <h1>{title}</h1>
        <span className="count">#{String(no).padStart(4, "0")} · {dexName}</span>
      </div>
      {error && <p className="msg error" role="alert">{t.errorGeneric}</p>}

      {groups.map(({ status, heading }) => {
        const list = forms.filter((f) => f.status === status);
        if (list.length === 0) return null;
        return (
          <section key={status}>
            {heading && <h2 className="gen-title">{heading}</h2>}
            <div className="grid forms">
              {list.map((f) => {
                const s = ticks.get(f.id);
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
