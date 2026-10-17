import { buildWorkbook } from "@/lib/collection-sheet";
import { getPokemon } from "@/lib/data";
import { today } from "@/lib/dexes";
import { getProfile } from "@/lib/session";
import { byDex, getTicks } from "@/lib/ticks";
import { writeXlsxBook } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

/** The signed-in user's whole collection (every dex they show) as .xlsx: Instructions, then a tab per dex group. */
export async function GET() {
  const profile = await getProfile();
  if (!profile) return new Response("Not signed in", { status: 401 });
  const [all, ticks] = await Promise.all([getPokemon(), getTicks()]);
  const day = today();
  const file = writeXlsxBook(buildWorkbook(all, byDex(ticks), day, profile));
  const who = (profile.nickname ?? "").replace(/[^A-Za-z0-9]/g, "");
  return new Response(file.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="RepDex${who ? `-${who}` : ""}-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
