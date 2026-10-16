"use client";

import type { Lang } from "@/lib/i18n";
import { setLanguage } from "./lang-actions";

/** Language choice in the top menu for signed-out visitors; switches as soon as a language is picked. */
export function LanguagePicker({ lang, label, id }: { lang: Lang; label: string; id: string }) {
  return (
    <form action={setLanguage} className="lang-picker">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} name="language" defaultValue={lang} title={label} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        <option value="en">English</option>
        <option value="sv">Svenska</option>
        <option value="ja">日本語</option>
      </select>
      <noscript><button type="submit">{label}</button></noscript>
    </form>
  );
}
