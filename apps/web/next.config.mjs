/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@courtstats/shared"],
  // playwright-core (used by the PDF/JPEG export routes) pulls in several
  // optional native/protocol dependencies (chromium-bidi, kerberos, ...)
  // that it only actually requires at runtime for features this project
  // doesn't use. Webpack tries to statically resolve them anyway and fails
  // the build -- confirmed via a real Vercel deploy. Marking it (and
  // @sparticuz/chromium, same category of package) external skips that
  // static bundling and just require()s them normally at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ["playwright-core", "@sparticuz/chromium"],
    // Marking the package external (above) stops webpack from choking on
    // its optional deps, but Vercel's own file tracer still needs telling
    // separately to carry the actual Chromium binary archive into the
    // deployed function -- it's read via fs at runtime, not imported, so
    // static tracing misses it on its own (confirmed via a real deploy:
    // "input directory .../@sparticuz/chromium/bin does not exist"). npm
    // workspaces hoist the package to the repo root, not apps/web's own
    // node_modules, hence the ../../ -- confirmed via Test-Path locally.
    outputFileTracingIncludes: {
      "/api/games/[gameId]/export.jpg": ["../../node_modules/@sparticuz/chromium/bin/**/*"],
      "/api/games/[gameId]/export.pdf": ["../../node_modules/@sparticuz/chromium/bin/**/*"],
    },
  },
};

export default nextConfig;
