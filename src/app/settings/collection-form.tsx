"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Dict } from "@/lib/i18n";
import { previewCollection, saveCollection, type UploadResult } from "./collection-actions";

type Ok = Extract<UploadResult, { ok: true }>;

/** Changes the rules make on top of the file, e.g. Caught ticked because of Lucky. */
function RuleLines({ r }: { r: Ok }) {
  const ticked = r.summary.filter((s) => s.alsoTicked > 0);
  const unticked = r.summary.filter((s) => s.alsoUnticked > 0);
  if (!ticked.length && !unticked.length) return null;
  return (
    <ul className="sheet-rules">
      {ticked.map((s) => <li key={`t${s.dex}`}>Also ticked in {s.name} (needed by a tick in the file): {s.alsoTicked}</li>)}
      {unticked.map((s) => <li key={`u${s.dex}`}>Also unticked in {s.name} (its regular tick was unticked): {s.alsoUnticked}</li>)}
    </ul>
  );
}

function Summary({ r }: { r: Ok }) {
  const tabs = [...new Set(r.summary.filter((s) => s.tab).map((s) => s.tab))];
  const n = (x: number, word: string) => (x ? `${x} ${word}` : null);
  return (
    <div className="sheet-summary">
      <table>
        <thead><tr><th>Tab</th><th>Dex</th><th>Changes</th><th>Unchanged</th></tr></thead>
        <tbody>
          {tabs.flatMap((tab) => r.summary.filter((s) => s.tab === tab).map((s, i) => {
            const parts = [n(s.ticked, "ticked"), n(s.unticked, "unticked"), n(s.wantedOn, "newly wanted"), n(s.wantedOff, "no longer wanted")].filter(Boolean);
            return (
              <tr key={s.dex} className={parts.length ? "changed" : undefined}>
                <td>{i === 0 ? tab : ""}</td>
                <td>{s.name}</td>
                <td>{parts.length ? parts.join(", ") : "No changes"}</td>
                <td>{s.unchanged}</td>
              </tr>
            );
          }))}
        </tbody>
      </table>
      <RuleLines r={r} />
      {r.untouched.length > 0 && <p className="note">Not in the file, left as they are: {r.untouched.join(", ")}.</p>}
      {r.ignoredTabs.length > 0 && <p className="note">Tabs not read (no ID or dex columns): {r.ignoredTabs.join(", ")}.</p>}
      {r.ignoredColumns.length > 0 && (
        <p className="note">Columns not used: {r.ignoredColumns.map((c) => `${c.tab} → ${c.column} (${c.why})`).join("; ")}.</p>
      )}
    </div>
  );
}

function Skipped({ r }: { r: Ok }) {
  const [copied, setCopied] = useState(false);
  if (r.skippedCount === 0) return null;
  const text = r.skipped.map((f) => `${f.tab} · row ${f.row} · ${f.id || "(no ID)"}${f.column ? ` · ${f.column}` : ""}: ${f.text}`);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* not copied */ }
  };
  return (
    <details className="sheet-skipped">
      <summary className="msg error">{r.skippedCount} {r.skippedCount === 1 ? "cell or row" : "cells or rows"} skipped – show</summary>
      <button type="button" className="btn ghost" onClick={copy}>{copied ? "✓ Copied" : "Copy list"}</button>
      <ul className="faulty">
        {text.map((line, i) => <li key={i}>{line}</li>)}
        {r.skippedCount > r.skipped.length && <li>… and {r.skippedCount - r.skipped.length} more</li>}
      </ul>
    </details>
  );
}

/**
 * Settings panel for the collection spreadsheet: download, then upload in two steps. The upload is
 * checked first and only saved after "Save changes". The report is in English, like the file.
 */
export function CollectionForm({ t }: { t: Dict }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [pending, start] = useTransition();
  const send = (save: boolean) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    start(async () => setResult(await (save ? saveCollection(fd) : previewCollection(fd))));
  };
  const ok = result?.ok ? result : null;
  const totals = ok ? ok.summary.reduce((n, s) => n + s.ticked + s.unticked + s.wantedOn + s.wantedOff + s.alsoTicked + s.alsoUnticked, 0) : 0;

  return (
    <section className="panel" data-no-guard>
      <h2>{t.spreadsheet}</h2>
      <p className="help">{t.spreadsheetHelp}</p>
      <p><a className="btn ghost" href="/collection/download" download>{t.download}</a></p>
      <div className="upload-row">
        <input
          type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
        />
        <button type="button" className="btn" disabled={!file || pending} onClick={() => send(false)}>
          {pending && !ok ? t.uploading : "Check file"}
        </button>
      </div>

      {result && !result.ok && <p className="msg error" role="alert">{result.error}</p>}
      {ok && !ok.saved && (
        <div role="status">
          <p className="msg">Nothing is saved yet. This is what the file changes:</p>
          <Summary r={ok} />
          <Skipped r={ok} />
          <div className="sheet-actions">
            <button type="button" className="btn" disabled={pending || totals === 0} onClick={() => send(true)}>
              {pending ? "Saving…" : totals === 0 ? "Nothing to save" : "Save changes"}
            </button>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => setResult(null)}>Cancel</button>
          </div>
        </div>
      )}
      {ok?.saved && (
        <div role="status">
          <p className="msg">Saved: {totals} {totals === 1 ? "tick" : "ticks"} changed. <Link href="/dexes">Check your Dexes →</Link></p>
          <Skipped r={ok} />
        </div>
      )}
    </section>
  );
}
