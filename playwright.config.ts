import { defineConfig } from '@playwright/test'

// Browser tests: full games in every mode against the Vite dev server. The
// map's network traffic is stubbed in the tests (see e2e/harness.ts), so no
// Mapbox token or network is needed, and Supabase is switched off so every
// run is a guest run with nothing sent anywhere.
const PORT = 5179

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    // Cloud sessions ship Chromium outside Playwright's cache; point at it
    // with PW_CHROMIUM_PATH. Locally, `npx playwright install chromium`.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_MAPBOX_TOKEN: 'pk.e2e-test', VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
})
