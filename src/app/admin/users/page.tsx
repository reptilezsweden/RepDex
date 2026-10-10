import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { setRole } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requireAdmin();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id,email,nickname,role,created_at").order("created_at");
  const users = data ?? [];

  return (
    <>
      <p className="back"><Link href="/admin">← Admin</Link></p>
      <div className="dex-head">
        <h1>Users</h1>
        <span className="count">{users.length} accounts · {users.filter((u) => u.role === "admin").length} admins</span>
      </div>
      {error && (
        <p className="msg error" role="alert">
          {error === "self" ? "You can't remove your own admin rights. Ask another admin." : error}
        </p>
      )}
      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr><th>Nickname</th><th>Email</th><th>Joined</th><th>Role</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.nickname ?? "—"}{u.id === me.id && <span className="note-inline"> (you)</span>}</td>
                <td>{u.email ?? "—"}</td>
                <td className="num">{String(u.created_at).slice(0, 10)}</td>
                <td>{u.role === "admin" ? "Admin" : "User"}</td>
                <td>
                  {u.id !== me.id && (
                    <form action={setRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={u.role === "admin" ? "user" : "admin"} />
                      <button className="btn ghost">{u.role === "admin" ? "Remove admin" : "Make admin"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
