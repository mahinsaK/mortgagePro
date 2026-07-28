import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-critical",
      grep: /@critical|@public/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-critical",
      grep: /@critical|@public/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "iphone-critical",
      grep: /@critical|@public/,
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "android-critical",
      grep: /@critical|@public/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});
