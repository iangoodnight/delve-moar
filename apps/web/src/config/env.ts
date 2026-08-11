import * as z from 'zod';

function createEnv() {
  const EnvSchema = z.object({
    API_URL: z.url(),
    FONT_SOURCE: z.enum(['local', 'google']).default('local'),
    TITLE: z.string().default('DelveMoar'),
    // empty/unset disables error tracking (dev, CI); a set DSN must be a URL
    SENTRY_DSN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.url().optional(),
    ),
    // empty/unset disables analytics (dev, CI, opted-out self-hosters); when
    // set it is the Plausible data-domain. ANALYTICS_SRC points at the script
    // (cloud default; self-hosters override to their own instance).
    ANALYTICS_DOMAIN: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().optional(),
    ),
    ANALYTICS_SRC: z.url().default('https://plausible.io/js/script.js'),
  });

  const envVars = Object.entries(import.meta.env).reduce<
    Record<string, string>
  >((acc, curr) => {
    const [key, value] = curr as [string, string];
    if (key.startsWith('VITE_APP_')) {
      acc[key.replace('VITE_APP_', '')] = value;
    }
    return acc;
  }, {});

  const parsedEnv = EnvSchema.safeParse(envVars);
  if (!parsedEnv.success) {
    throw new Error(
      `Invalid env provided.\n${z.prettifyError(parsedEnv.error)}`,
    );
  }

  return parsedEnv.data;
}

export const env = createEnv();
