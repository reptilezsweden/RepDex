/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Images folder is served from the jsDelivr CDN, not bundled into the app.
  outputFileTracingExcludes: { "*": ["./Images/**/*"] },
};

export default nextConfig;
