import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    include: ['src/__tests__/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      PORT: '3099',
    },
    globalSetup: ['src/__tests__/globalSetup.ts'],
  },
})
