// Shared by server and client code (plain data, no React).

export type BadgeIconKind =
  | "lucky" | "xxl" | "xxs" | "perfect" | "shadow" | "purified" | "shadow_shiny" | "purified_shiny"
  | "mega" | "gigantamax" | "dynamax";

/** Icon a dex uses for its own tick; dexes without one use the checkmark. */
export const DEX_ICON: Partial<Record<string, BadgeIconKind>> = {
  lucky: "lucky", xxl: "xxl", xxs: "xxs", perfect: "perfect", shadow: "shadow", purified: "purified",
  shadow_shiny: "shadow_shiny", purified_shiny: "purified_shiny",
  mega: "mega", gigantamax: "gigantamax", dynamax: "dynamax",
};
