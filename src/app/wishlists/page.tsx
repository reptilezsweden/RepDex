import Link from "next/link";
import { redirect } from "next/navigation";
import { getPokemon } from "@/lib/data";
import { allFormsOn, isOn, today } from "@/lib/dexes";
import { getDict, getProfile } from "@/lib/session";
import { byDex, getTicks } from "@/lib/ticks";
import { buildWishlist, wishlistDefs } from "@/lib/wishlists";
import { WishlistTabs } from "./wishlist-tabs";

export const dynamic = "force-dynamic";

export default async function WishlistsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const defs = wishlistDefs(isOn("shiny3", profile.visible_dexes));
  const [{ lang, t }, all, ticks] = await Promise.all([
    getDict(), getPokemon(), getTicks([...new Set(defs.flatMap((w) => w.dexes))]),
  ]);
  const ticksBy = byDex(ticks);
  // Your own page always lists everything; "lowest evolution" only applies to the public page.
  // Dexes with All forms on list each missing form.
  const lists = defs.map((w) => buildWishlist(w, all, ticksBy, today(), lang, false, (k) => allFormsOn(k, profile)));
  const publicHref = profile.nickname ? `/user/${encodeURIComponent(profile.nickname)}` : null;

  return (
    <>
      <div className="dex-head">
        <h1>{t.wishlists}</h1>
        {publicHref && <Link href={publicHref} className="public-link">{t.yourPublicPage}: {publicHref}</Link>}
      </div>
      <p className="note">{t.wishlistsHelp}</p>
      <WishlistTabs
        lists={lists} t={t} userId={profile.id}
        initialPublic={profile.public_wishlists ?? []} initialLowest={profile.wish_lowest ?? false}
      />
    </>
  );
}
