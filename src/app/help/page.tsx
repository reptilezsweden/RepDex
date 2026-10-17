import Link from "next/link";
import { getDict } from "@/lib/session";
import { GUIDES, guideLang } from "./guides";

/** Help: every guide, Getting started first. Open to everyone. */
export default async function HelpPage() {
  const { lang, t } = await getDict();
  const l = guideLang(lang);
  return (
    <>
      <h1>{t.help}</h1>
      {lang === "ja" && <p className="note">{t.guidesEnglishOnly}</p>}
      <div className="guide-list">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/help/${g.slug}`} className={`guide-tile${g.slug === "first-use" ? " first" : ""}`}>
            <span className="name">{g.title[l]}</span>
            <span className="sub">{g.summary[l]}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
