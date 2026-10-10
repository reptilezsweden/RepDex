"use client";

import { useActionState } from "react";
import { saveGen, type AdminState } from "../actions";

/** One editable generation; gen = null is the empty row for adding a new one. */
export function GenRow({ gen }: { gen: { gen_nr: number; region: string; prefix_name: string } | null }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(saveGen, undefined);
  return (
    <form action={action} className="gen-row">
      {gen && <input type="hidden" name="original_gen_nr" value={gen.gen_nr} />}
      <input name="gen_nr" type="number" step="any" defaultValue={gen?.gen_nr} placeholder="10" aria-label="Number" required />
      <input name="region" type="text" defaultValue={gen?.region} placeholder="Region" aria-label="Region" required />
      <input name="prefix_name" type="text" defaultValue={gen?.prefix_name} placeholder="Prefix name" aria-label="Prefix name" required />
      <button className={gen ? "btn ghost" : "btn"} disabled={pending}>{gen ? "Save" : "Add"}</button>
      {state?.error && <span className="row-msg error">{state.error}</span>}
      {state?.message && <span className="row-msg">{state.message}</span>}
    </form>
  );
}
