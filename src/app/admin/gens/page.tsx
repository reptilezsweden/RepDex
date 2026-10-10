import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { GenRow } from "./gen-row";

export const dynamic = "force-dynamic";

export default async function AdminGens() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("gens").select("*").order("gen_nr");
  const gens = (data ?? []).map((g) => ({ gen_nr: Number(g.gen_nr), region: String(g.region), prefix_name: String(g.prefix_name) }));

  return (
    <>
      <p className="back"><Link href="/admin">← Admin</Link></p>
      <h1>Generations</h1>
      <p className="note">The number is only used for sorting; the app shows the region name.</p>
      <div className="gen-rows">
        <div className="gen-row head"><span>Number</span><span>Region</span><span>Prefix name</span><span /></div>
        {gens.map((g) => <GenRow key={g.gen_nr} gen={g} />)}
        <GenRow gen={null} />
      </div>
    </>
  );
}
