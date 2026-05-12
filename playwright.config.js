const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './playwright/e2e',
  outputDir: './playwright/results',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright/report', open: 'never' }]],

  use: {
    baseURL: 'https://formularms.bottle.com.np',
    extraHTTPHeaders: { Accept: 'application/json' },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
