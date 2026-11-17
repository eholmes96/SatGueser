import { defineConfig } from 'vitest/config'

// Unit tests only (pure game logic, data invariants, the daily-submit
// handler). The browser tests in e2e/ run under Playwright instead.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
})
