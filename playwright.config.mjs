import { defineConfig, devices } from '@playwright/test';

// Drives the built UI (dist/ui.html) in real Chromium. Build dist/ before running
// (the test:ui npm script does this); the webServer serves it statically.
export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4188',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: undefined } },
  ],
  webServer: {
    command: 'vite preview --outDir dist --port 4188 --strictPort',
    url: 'http://localhost:4188/ui.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
