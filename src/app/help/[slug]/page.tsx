import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict } from "@/lib/session";
import { GUIDES, guideBySlug, guideLang } from "../guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

/** One guide, with links to the others below. */
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();
  const { lang, t } = await getDict();
  const l = guideLang(lang);
  return (
    <article className="guide">
      <p className="back"><Link href="/help">← {t.help}</Link></p>
      <h1>{guide.title[l]}</h1>
      {lang === "ja" && <p className="note">{t.guidesEnglishOnly}</p>}
      {guide.body[l]}
      <nav className="guide-more" aria-label={t.help}>
        <h2>{t.moreGuides}</h2>
        <ul>
          {GUIDES.filter((g) => g.slug !== slug).map((g) => <li key={g.slug}><Link href={`/help/${g.slug}`}>{g.title[l]}</Link></li>)}
        </ul>
      </nav>
    </article>
  );
}
