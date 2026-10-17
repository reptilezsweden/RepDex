import Link from "next/link";

/** The small "?" next to a page title that opens the page's guide. */
export function HelpLink({ guide, label }: { guide: string; label: string }) {
  return (
    <Link href={`/help/${guide}`} className="help-link" title={label} aria-label={label}>?</Link>
  );
}
