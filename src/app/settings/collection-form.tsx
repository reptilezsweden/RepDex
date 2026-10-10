"use client";

import { useActionState } from "react";
import type { Dict } from "@/lib/i18n";
import { uploadCollection, type UploadState } from "./collection-actions";

/** Settings panel for downloading and uploading the collection spreadsheet. */
export function CollectionForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadCollection, undefined);
  const message = (key: string) => {
    if (key.startsWith("sheetErrors.")) return t.sheetErrors[key.slice(12)] ?? t.errorGeneric;
    const v = (t as unknown as Record<string, unknown>)[key];
    return typeof v === "string" ? v : t.errorGeneric;
  };

  return (
    <section className="panel">
      <h2>{t.spreadsheet}</h2>
      <p className="help">{t.spreadsheetHelp}</p>
      <p><a className="btn ghost" href="/collection/download" download>{t.download}</a></p>
      <form action={action} className="upload-row">
        <input type="file" name="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" required />
        <button className="btn" disabled={pending}>{pending ? t.uploading : t.upload}</button>
      </form>
      {state && !state.done && <p className="msg error" role="alert">{message(state.error)}</p>}
      {state?.done && (
        <div role="status">
          <p className="msg">{t.uploadDone.replace("{u}", String(state.updated)).replace("{n}", String(state.unchanged))}</p>
          {state.faultyCount > 0 && (
            <>
              <p className="msg error">{t.faultyRows.replace("{n}", String(state.faultyCount))}</p>
              <ul className="faulty">
                {state.faulty.map((f) => (
                  <li key={f.row}>{t.row} {f.row}{f.id ? ` · ${f.id}` : ""}: {t.sheetErrors[f.reason] ?? f.reason}</li>
                ))}
                {state.faultyCount > state.faulty.length && <li>…</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
