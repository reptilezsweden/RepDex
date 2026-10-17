import { readFileSync } from "node:fs";

// App version (package.json) and build (the commit Vercel builds), shown in the app.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_BUILD: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
  // The Images folder is served from the jsDelivr CDN, not bundled into the app.
  outputFileTracingExcludes: { "*": ["./Images/**/*"] },
  // Room for collection spreadsheet uploads.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
