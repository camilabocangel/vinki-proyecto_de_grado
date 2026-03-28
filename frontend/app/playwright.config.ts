import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { outputFolder: 'coverage/e2e' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host',
    port: 5174,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
