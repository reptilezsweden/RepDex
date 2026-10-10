import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { href: "/admin/pokemon", title: "Pokémon", text: "Search, edit, add and delete entries in the availability list." },
  { href: "/admin/gens", title: "Generations", text: "Edit region names and add new generations." },
  { href: "/admin/users", title: "Users", text: "Make other users admin, or remove admin rights." },
  { href: "/admin/log", title: "Change log", text: "Every change to the list, with who made it. Revert single edits." },
];

export default async function AdminHome() {
  await requireAdmin();
  return (
    <>
      <h1>Admin</h1>
      <div className="dex-list">
        {SECTIONS.map((s) => (
          <div key={s.href} className="dex-tile">
            <Link href={s.href}>
              <div className="name">{s.title}</div>
              <div className="count">{s.text}</div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
