import Link from "next/link";
import { TRANSLATION_LANGS, requireAdmin } from "@/lib/admin";
import { getPokemon } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { PhraseRow } from "./phrase-row";

export const dynamic = "force-dynamic";

/**
 * Repeated texts (text_translations), translated once by their English wording. For now: evolution
 * requirements. Pokémon names and forms are translated on each Pokémon's edit page.
 */
export default async function TranslationsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [all, { data }] = await Promise.all([
    getPokemon(),
    supabase.from("text_translations").select("kind,source,lang,text").eq("kind", "evolution_requirement"),
  ]);
  const uses = new Map<string, number>();
  for (const p of all) {
    if (p.gender_of || !p.evolution_requirement) continue;
    uses.set(p.evolution_requirement, (uses.get(p.evolution_requirement) ?? 0) + 1);
  }
  const saved = new Map<string, Record<string, string>>();
  for (const t of data ?? []) saved.set(t.source, { ...(saved.get(t.source) ?? {}), [t.lang]: t.text });
  const phrases = [...uses.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const missing = phrases.filter(([src]) => TRANSLATION_LANGS.some(({ lang }) => lang === "ja" && !saved.get(src)?.[lang])).length;

  return (
    <>
      <p className="back"><Link href="/admin">← Admin</Link></p>
      <h1>Translations</h1>
      <p className="note">
        Evolution requirements, translated once and used on every Pokémon with the same English text (the number is how
        many use it). Empty fields show the English text. {missing} still lack Japanese.
      </p>
      <section className="panel">
        <h2>Evolution requirements</h2>
        {phrases.map(([source, n]) => (
          <PhraseRow key={source} kind="evolution_requirement" source={source} uses={n} langs={TRANSLATION_LANGS} values={saved.get(source) ?? {}} />
        ))}
      </section>
    </>
  );
}
