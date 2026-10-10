/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Images folder is served from the jsDelivr CDN, not bundled into the app.
  outputFileTracingExcludes: { "*": ["./Images/**/*"] },
  // Room for collection spreadsheet uploads.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
