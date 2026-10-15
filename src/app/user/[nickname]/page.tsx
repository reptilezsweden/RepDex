import { createClient as createPlainClient } from "@supabase/supabase-js";
import { WishlistTabs } from "@/app/wishlists/wishlist-tabs";
import { getPokemon } from "@/lib/data";
import { allFormsOn, today, type Tick } from "@/lib/dexes";
import { getDict } from "@/lib/session";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { byDex } from "@/lib/ticks";
import { buildWishlist, wishlistDefs } from "@/lib/wishlists";

export const dynamic = "force-dynamic";

type Row = { nickname: string; lists: string[]; dex: string | null; pokemon_id: string | null; collected: boolean | null; wanted: boolean | null };

/** A user's public wishlists, readable without signing in. Users with none public don't exist here. */
export default async function PublicUserPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params;
  const { lang, t } = await getDict();
  const supabase = createPlainClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Paged past Supabase's 1,000-row limit.
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.rpc("public_wishlist", { p_nickname: decodeURIComponent(nickname) }).range(from, from + 999);
    if (error || !data) break;
    rows.push(...(data as Row[]));
    if (data.length < 1000) break;
  }

  const shown = rows[0]?.lists ?? [];
  // The Shiny list also covers Shiny ⭐⭐⭐ when the owner has it on (the rows then include its ticks).
  const shiny3 = rows.length > 0 && (await supabase.rpc("public_wish_shiny3", { p_nickname: decodeURIComponent(nickname) })).data === true;
  const defs = wishlistDefs(shiny3).filter((w) => shown.includes(w.key));
  if (defs.length === 0) {
    return (
      <div className="panel no-user">
        <h1>{t.noUserFound}</h1>
      </div>
    );
  }

  const ticks: Tick[] = rows
    .filter((r) => r.dex && r.pokemon_id)
    .map((r) => ({ dex: r.dex!, pokemon_id: r.pokemon_id!, collected: !!r.collected, wanted: !!r.wanted }));
  const [all, lowestRes, formsRes] = await Promise.all([
    getPokemon(),
    supabase.rpc("public_wish_lowest", { p_nickname: decodeURIComponent(nickname) }),
    supabase.rpc("public_wish_all_forms", { p_nickname: decodeURIComponent(nickname) }),
  ]);
  const lowest = lowestRes.data === true;
  const ownerForms = { all_forms_dexes: (formsRes.data as string[] | null) ?? [] };
  const ticksBy = byDex(ticks);
  // Follows the owner's "lowest evolution" choice; lists with nothing missing are left out.
  const lists = defs.map((w) => buildWishlist(w, all, ticksBy, today(), lang, lowest, (k) => allFormsOn(k, ownerForms))).filter((l) => l.items.length > 0);
  if (lists.length === 0) {
    return (
      <div className="panel no-user">
        <h1>{t.noUserFound}</h1>
      </div>
    );
  }

  return (
    <>
      <div className="dex-head">
        <h1>{rows[0].nickname}</h1>
        <span className="count">{t.wishlists}</span>
      </div>
      <p className="note">{t.publicWishlistsHelp}</p>
      <WishlistTabs lists={lists} t={t} />
    </>
  );
}
