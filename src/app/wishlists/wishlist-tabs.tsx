"use client";

import { useEffect, useState } from "react";
import { BadgeIcon, MonImage, StarIcon } from "@/components/mon-ui";
import { DEX_ICON } from "@/lib/dex-icons";
import { dexByKey } from "@/lib/dexes";
import type { Dict, Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Wishlist } from "@/lib/wishlists";
import { wishlistImages } from "@/lib/wishlist-image";

/** The icon a dex ticks with: its badge, a star for shiny dexes without one, else the checkmark. */
function DexMark({ dex, lang }: { dex: string; lang: Lang }) {
  const label = dexByKey(dex)?.name[lang] ?? dex;
  const badge = DEX_ICON[dex];
  return (
    <span className="wish-dex" title={label} aria-label={label} role="img">
      {badge ? <span className="badge slot-icon"><BadgeIcon kind={badge} size={16} /></span>
        : dex === "shiny" || dex === "shiny3" || dex.endsWith("_shiny") ? <StarIcon kind={dex === "shiny3" ? "star3" : "star"} size={16} />
          : (
            <span className="count-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg>
            </span>
          )}
    </span>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="copy-icon">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

/** The search phrase; clicking copies it. */
function SearchPhrase({ text, t }: { text: string; t: Dict }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className="search-phrase" onClick={copy} title={t.copySearch}>
      <code>{text}</code>
      <span className="copy-state">{copied ? `✓ ${t.copied}` : <CopyIcon />}</span>
    </button>
  );
}

/**
 * Wishlist tabs. On the user's own page each list has a "Show in public" box, saved in
 * profiles.public_wishlists; on the public page (no userId) the boxes are left out.
 */
/** Search phrases come in the trading partner's game language; this browser remembers the choice. */
const GAME_LANG_KEY = "rd-search-lang";

/** Saves the list as picture(s): the share sheet where the browser can share files (phones), else downloads. */
function SaveImage({ list, owner, gameLang, t }: { list: Wishlist; owner?: string; gameLang: "en" | "ja"; t: Dict }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function save() {
    setBusy(true);
    setFailed(false);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const blobs = await wishlistImages({
        title: list.name, owner, date, items: list.items, search: gameLang === "ja" ? list.searchJa : list.search,
        searchLabel: t.searchPhrase, part: (n, of) => t.imagePart.replace("{n}", String(n)).replace("{of}", String(of)),
      });
      const slug = `${(owner ?? "RepDex").replace(/[^A-Za-z0-9]/g, "")}-${list.key}-${date}`;
      const files = blobs.map((b, i) => new File([b], `${slug}${blobs.length > 1 ? `-${i + 1}` : ""}.png`, { type: "image/png" }));
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files }) && window.matchMedia("(pointer: coarse)").matches) {
        try { await navigator.share({ files, title: list.name }); } catch { /* cancelled */ }
      } else {
        for (const f of files) {
          const url = URL.createObjectURL(f);
          const a = document.createElement("a");
          a.href = url;
          a.download = f.name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      }
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }
  return (
    <>
      <button type="button" className="btn ghost save-image" onClick={save} disabled={busy}>
        {busy ? t.loading : t.saveAsImage}
      </button>
      {failed && <span className="msg error">{t.errorGeneric}</span>}
    </>
  );
}

export function WishlistTabs({ lists, t, lang = "en", userId, owner, initialPublic = [], initialLowest = false }: {
  lists: Wishlist[];
  /** Nickname shown on saved pictures. */
  owner?: string;
  t: Dict;
  lang?: Lang;
  userId?: string;
  initialPublic?: string[];
  initialLowest?: boolean;
}) {
  // One "lowest evolution" choice for every list, saved on the profile. It only changes the
  // public page; this page always lists every missing Pokémon.
  const [lowest, setLowest] = useState(initialLowest);
  function toggleLowest() {
    if (!userId) return;
    const next = !lowest;
    setLowest(next);
    void createClient().from("profiles").update({ wish_lowest: next }).eq("id", userId)
      .then(({ error }: { error: unknown }) => setSaveFailed(!!error));
  }
  const [tab, setTabState] = useState(lists[0]?.key ?? "");
  // Each tab has its own link (#shiny, #xxs…), so a list can be bookmarked or shared directly.
  function setTab(key: string) {
    setTabState(key);
    try { history.replaceState(null, "", `#${key}`); } catch { /* link not updated */ }
  }
  useEffect(() => {
    const fromHash = () => {
      const key = decodeURIComponent(location.hash.slice(1));
      if (lists.some((l) => l.key === key)) setTabState(key);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [lists]);
  const [gameLang, setGameLang] = useState<"en" | "ja">(lang === "ja" ? "ja" : "en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GAME_LANG_KEY);
      if (saved === "en" || saved === "ja") setGameLang(saved);
    } catch { /* no storage: keep the default */ }
  }, []);
  function chooseGameLang(v: "en" | "ja") {
    setGameLang(v);
    try { localStorage.setItem(GAME_LANG_KEY, v); } catch { /* not remembered */ }
  }
  // Big picture: the image grows while hovered (desktop) or after a tap (touch screens). One at a time:
  // tapping another shrinks the previous one; tapping the same one again shrinks it.
  const [big, setBig] = useState<string | null>(null);
  function tapItem(id: string) {
    try { if (window.matchMedia("(hover: hover)").matches) return; } catch { /* assume touch */ }
    setBig((prev) => (prev === id ? null : id));
  }
  const [shown, setShown] = useState(() => new Set(initialPublic));
  const [saveFailed, setSaveFailed] = useState(false);
  const current = lists.find((l) => l.key === tab) ?? lists[0];

  function togglePublic(key: string) {
    if (!userId) return;
    const next = new Set(shown);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setShown(next);
    // Saved in list order so the public page shows the tabs in the same order.
    const value = lists.map((l) => l.key).filter((k) => next.has(k));
    void createClient().from("profiles").update({ public_wishlists: value }).eq("id", userId)
      .then(({ error }: { error: unknown }) => setSaveFailed(!!error));
  }

  if (!current) return null;
  return (
    <>
      {userId && (
        <div className="switches wish-common">
          <button type="button" role="switch" aria-checked={lowest} className="switch" onClick={toggleLowest}>
            <span className="track" aria-hidden="true"><span className="knob" /></span>
            {t.lowestEvolution}
          </button>
          <span className="help-inline">{t.lowestEvolutionHelp}</span>
        </div>
      )}
      <div className="wish-tabs" role="tablist">
        {lists.map((l) => (
          <button
            key={l.key} type="button" role="tab" aria-selected={l.key === current.key}
            className={l.key === current.key ? "on" : undefined} onClick={() => setTab(l.key)}
          >
            {l.name}<span className="n">{l.items.length}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel">
        <div className="dex-head">
          <h2 className="wish-title">{current.name}</h2>
          <span className="count">{current.items.length}</span>
          {userId && (
            <button
              type="button" role="switch" aria-checked={shown.has(current.key)} className="switch"
              style={{ marginLeft: "auto" }} onClick={() => togglePublic(current.key)}
            >
              <span className="track" aria-hidden="true"><span className="knob" /></span>
              {t.showInPublic}
            </button>
          )}
        </div>
        {saveFailed && <p className="msg error" role="alert">{t.errorGeneric}</p>}

        {current.items.length === 0 ? (
          <p className="empty">{t.wishlistEmpty}</p>
        ) : (
          <>
            <div className="search-row">
              <SearchPhrase text={gameLang === "ja" ? current.searchJa : current.search} t={t} />
              <span className="seg game-lang" role="group" aria-label={t.searchGameLanguage} title={t.searchGameLanguage}>
                <button type="button" aria-pressed={gameLang === "en"} onClick={() => chooseGameLang("en")}>EN</button>
                <button type="button" aria-pressed={gameLang === "ja"} onClick={() => chooseGameLang("ja")}>日本語</button>
              </span>
              <SaveImage list={current} owner={owner} gameLang={gameLang} t={t} />
            </div>
            <ul className="wish-grid">
              {current.items.map((i) => (
                <li key={i.id} className={big === i.id ? "big" : undefined} onClick={() => tapItem(i.id)}>
                  <MonImage file={i.image} size={48} />
                  <span className="no">
                    #{String(i.no).padStart(4, "0")}
                    {i.dexes && i.dexes.map((d) => <DexMark key={d} dex={d} lang={lang} />)}
                  </span>
                  <span className="nm">
                    {i.name}
                    {i.gender && <span className={`g-sign ${i.gender === "♂" ? "m" : "f"}`} aria-label={i.gender === "♂" ? t.male : t.female}> {i.gender}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
