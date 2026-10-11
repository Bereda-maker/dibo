import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const useLocalServer = !process.env.PLAYWRIGHT_BASE_URL;
const crossBrowser = process.env.PLAYWRIGHT_CROSS_BROWSER === "1";
const projects = crossBrowser
  ? [
      { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } },
      { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ]
  : [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } } }];

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]],
  outputDir: "test-results/artifacts",
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects,
  webServer: useLocalServer ? {
    command: "cd apps/web && /home/ubuntu/.bun/bin/bun run dev --hostname 127.0.0.1 --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_DEMO_MODE: "true", NEXT_PUBLIC_API_URL: "http://127.0.0.1:8787", NODE_ENV: "development" },
  } : undefined,
});
