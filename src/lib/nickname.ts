/** Pokémon GO nickname rules: 1–15 letters or digits. */
export const NICKNAME_RE = /^[A-Za-z0-9]{1,15}$/;

export function cleanNickname(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim();
}
