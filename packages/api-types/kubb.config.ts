import { defineConfig } from '@kubb/core';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginZod } from '@kubb/plugin-zod';

// Kubb codegen for Zod schemas, paired with openapi-typescript's TS-type
// output. Drives `src/zod/`; the openapi-typescript output lives at
// `src/index.ts` alongside it.
//
// Run via `pnpm --filter @delve-moar/api-types gen:zod` or as part of
// `scripts/gen_types.sh` (which also starts the API server first).
export default defineConfig({
  root: '.',
  input: {
    path: 'http://localhost:8000/openapi.json',
  },
  output: {
    path: 'src/zod',
    clean: true,
    format: false, // our commit hooks handle the formatting
  },
  plugins: [
    pluginOas(),
    pluginZod({
      // Override the plugin's default `zod/` subdir so output lands flat
      // under `src/zod/` instead of `src/zod/zod/`.
      output: { path: '.' },
    }),
  ],
});
