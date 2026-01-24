import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/supabase/**',
        '**/*.d.ts',
        'node_modules/**'
      ],
      thresholds: {
        'src/lib/admin-auth.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        },
        'src/lib/encryption.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        },
        'src/lib/tool-schema-validator.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95
        },
        'src/lib/cron-utils.ts': {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95
        },
        'src/lib/deployment.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90
        },
        'src/lib/ai-sdk-provider.ts': {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
