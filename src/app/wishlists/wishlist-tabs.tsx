"use client";

import { useEffect, useState } from "react";
import { MonImage } from "@/components/mon-ui";
import type { Dict, Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Wishlist } from "@/lib/wishlists";

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

export function WishlistTabs({ lists, t, lang = "en", userId, initialPublic = [], initialLowest = false }: {
  lists: Wishlist[];
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
  const [tab, setTab] = useState(lists[0]?.key ?? "");
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
  // Big pictures: the image fills its box while hovered (desktop) or after a tap (touch screens, tap again to go back).
  const [big, setBig] = useState(() => new Set<string>());
  function tapItem(id: string) {
    try { if (window.matchMedia("(hover: hover)").matches) return; } catch { /* assume touch */ }
    setBig((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            </div>
            <ul className="wish-grid">
              {current.items.map((i) => (
                <li key={i.id} className={big.has(i.id) ? "big" : undefined} onClick={() => tapItem(i.id)}>
                  <MonImage file={i.image} size={48} />
                  <span className="no">#{String(i.no).padStart(4, "0")}</span>
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
