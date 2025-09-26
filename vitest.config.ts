import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: [
            './test/api.test.ts',
            './test/operations.test.ts',
            './test/performance.test.ts'
          ],
          name: 'Node'
        }
      },
      {
        test: {
          include: [
            './test/api.test.ts',
            './test/operations.test.ts',
            './test/performance.test.ts',
            './test/regressions.test.ts'
          ],
          name: 'Browser',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [
              { browser: "chromium" }
            ],
          }
        }
      }
    ]
  },
})
