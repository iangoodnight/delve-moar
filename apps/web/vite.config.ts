import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Upload source maps to Sentry only when an auth token is present (production
// builds on Vercel). Local and CI builds skip it, so they never fail on a
// missing token, and source maps are only emitted when they will be uploaded
// and deleted by the plugin (never served).
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryPlugins = sentryAuthToken
  ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: sentryAuthToken,
      }),
    ]
  : [];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    ...sentryPlugins,
  ],

  build: {
    sourcemap: Boolean(sentryAuthToken),
  },

  server: {
    // usePolling lets Vite's watcher see edits across a Docker bind mount
    // (macOS doesn't forward native FS events). Inert unless the compose web
    // service sets VITE_USE_POLLING, so local dev and CI are untouched.
    ...(process.env.VITE_USE_POLLING === 'true'
      ? { watch: { usePolling: true } }
      : {}),
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    // default VITE_APP_API_URL so modules that resolve env.ts at import time
    // e.g. lib/api-client.ts) have a valid URL during tests.
    env: {
      VITE_APP_API_URL: 'http://localhost:8000',
      VITE_APP_FONT_SOURCE: 'local',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        // these are mostly wrappers around radix components, no testable logic
        'src/components/ui/typography/*.tsx',
        'src/testing/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
});
