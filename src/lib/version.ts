// The app's version (package.json, set at build time by next.config.mjs) and the commit it was built from.
// Versions follow semver: 0.x during the beta; the middle number for new features, the last for fixes.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
export const APP_BUILD = process.env.NEXT_PUBLIC_APP_BUILD ?? "";
