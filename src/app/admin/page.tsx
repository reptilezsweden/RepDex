import Link from "next/link";
import { adminPending, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { href: "/admin/pokemon", title: "Pokémon", text: "Search, edit, add and delete entries in the availability list." },
  { href: "/admin/gens", title: "Generations", text: "Edit region names and add new generations." },
  { href: "/admin/users", title: "Users", text: "Make other users admin, or remove admin rights." },
  { href: "/admin/crawler", title: "Release-date crawler", text: "Dates found on the Pokémon GO Wiki. Review changed dates and unknown entries." },
  { href: "/admin/events", title: "Events", text: "Current and upcoming events from Leek Duck, with the Pokémon they feature." },
  { href: "/admin/log", title: "Change log", text: "Every change to the list, with who made it. Revert single edits." },
];

export default async function AdminHome() {
  await requireAdmin();
  const pending = await adminPending();
  return (
    <>
      <h1>Admin</h1>
      <div className="dex-list">
        {SECTIONS.map((s) => (
          <div key={s.href} className="dex-tile">
            <Link href={s.href}>
              <div className="name">
                {s.title}
                {s.href in pending && (
                  <span className={`pending-badge${pending[s.href] ? "" : " zero"}`} title="Waiting for a decision">{pending[s.href]}</span>
                )}
              </div>
              <div className="count">{s.text}</div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
