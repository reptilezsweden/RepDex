"use client";

import { useActionState } from "react";
import { MonImage } from "@/components/mon-ui";
import type { FieldDef } from "@/lib/admin";
import { savePokemon, type AdminState } from "../actions";

export function PokemonForm({
  fields, formTypes, gens, values, originalId, initialMessage,
}: {
  fields: FieldDef[];
  formTypes: string[];
  gens: { gen_nr: number; region: string }[];
  values: Record<string, unknown>;
  originalId: string | null;
  initialMessage?: string;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(
    savePokemon,
    initialMessage ? { message: initialMessage } : undefined,
  );
  const groups = [...new Set(fields.map((f) => f.group))];
  const val = (name: string) => {
    const v = values[name];
    return v === null || v === undefined ? "" : String(v);
  };

  return (
    <form action={action}>
      {originalId && <input type="hidden" name="original_id" value={originalId} />}
      {(values.image_regular || values.image_shiny) ? (
        <div className="admin-preview">
          <MonImage file={(values.image_regular as string) || null} size={96} />
          <MonImage file={(values.image_shiny as string) || null} size={96} />
        </div>
      ) : null}

      {groups.map((g) => (
        <section key={g} className="panel">
          <h2>{g}</h2>
          <div className="admin-fields">
            {fields.filter((f) => f.group === g).map((f) => (
              <div key={f.name} className={f.type === "bool" ? "check" : "field"}>
                {f.type === "bool" ? (
                  <label><input type="checkbox" name={f.name} defaultChecked={values[f.name] === true} /> {f.label}</label>
                ) : (
                  <>
                    <label htmlFor={`f-${f.name}`}>{f.label}{f.required ? " *" : ""}</label>
                    {f.type === "formType" ? (
                      <select id={`f-${f.name}`} name={f.name} defaultValue={val(f.name) || "Regular"}>
                        {formTypes.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    ) : f.name === "gen_nr" ? (
                      <select id={`f-${f.name}`} name={f.name} defaultValue={val(f.name)}>
                        <option value="">Choose…</option>
                        {gens.map((x) => <option key={x.gen_nr} value={x.gen_nr}>{x.gen_nr} · {x.region}</option>)}
                      </select>
                    ) : (
                      <input
                        id={`f-${f.name}`} name={f.name} defaultValue={val(f.name)} required={f.required}
                        type={f.type === "date" ? "date" : f.type === "int" || f.type === "number" ? "number" : "text"}
                        step={f.type === "number" ? "any" : undefined}
                        className={f.name === "id" || f.name.startsWith("image") || f.name === "evolves_from" ? "mono" : undefined}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {state?.error && <p className="msg error" role="alert">{state.error}</p>}
      {state?.message && <p className="msg" role="status">{state.message}</p>}
      <button className="btn" disabled={pending}>{pending ? "Saving…" : originalId ? "Save changes" : "Add Pokémon"}</button>
    </form>
  );
}
