const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iPhone 15 (WebKit)',
      use: {
        ...devices['iPhone 15'],
        browserName: 'webkit',
      },
    },
    {
      name: 'iPhone 15 layout (Chromium)',
      use: {
        ...devices['iPhone 15'],
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --directory public',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
