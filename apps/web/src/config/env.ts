import * as z from 'zod';

function createEnv() {
  const EnvSchema = z.object({
    API_URL: z.url(),
    FONT_SOURCE: z.enum(['local', 'google']).default('local'),
    TITLE: z.string().default('DelveMoar'),
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
