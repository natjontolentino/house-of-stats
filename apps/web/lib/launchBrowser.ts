import type { Browser } from "playwright-core";
import { chromium } from "playwright-core";

/**
 * Exports (PDF scoresheet, JPEG share graphic) render HTML through a
 * headless browser. Locally on Windows/macOS, the full `playwright` package
 * downloads its own Chromium at install time and playwright-core's
 * chromium.launch() finds it automatically via the shared browser cache --
 * no extra config needed there. But Vercel's serverless functions don't
 * carry that downloaded binary (confirmed via a real deploy: "Executable
 * doesn't exist at .../ms-playwright/..."), and @sparticuz/chromium (a
 * Chromium build trimmed to fit serverless function size limits) is
 * Linux-only, so it can't be the *only* path either -- it would break local
 * dev on this project's Windows machine. `process.env.VERCEL` is set by
 * Vercel's own build/runtime, so branch on that rather than NODE_ENV (which
 * would also be "production" for a local `next build && next start`).
 */
export async function launchExportBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromiumBinary = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      args: chromiumBinary.args,
      executablePath: await chromiumBinary.executablePath(),
      headless: true,
    });
  }
  return chromium.launch();
}
