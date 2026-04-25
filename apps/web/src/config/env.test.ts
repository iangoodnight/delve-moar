import { afterEach, describe, expect, it, vi } from 'vitest';

describe('createEnv', () => {
  // env.ts calls createEnv() at module level, so each test must:
  //   - stub import.meta.env via vi.stubEnv before importing
  //   - do a fresh dynamic import (module cache cleared by vi.resetModules)
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns parsed env when VITE_APP_API_URL is a valid URL', async () => {
    vi.stubEnv('VITE_APP_API_URL', 'http://localhost:8000');
    const { env } = await import('./env');
    expect(env.API_URL).toBe('http://localhost:8000');
  });

  it('throws when VITE_APP_API_URL is not a valid URL', async () => {
    vi.stubEnv('VITE_APP_API_URL', 'not-a-url');
    await expect(import('./env')).rejects.toThrow('Invalid env provided');
  });

  it('throws when VITE_APP_API_URL is empty', async () => {
    vi.stubEnv('VITE_APP_API_URL', '');
    await expect(import('./env')).rejects.toThrow('Invalid env provided');
  });

  it('error message includes the field name from prettifyError', async () => {
    vi.stubEnv('VITE_APP_API_URL', 'bad');
    await expect(import('./env')).rejects.toThrow(/API_URL/);
  });

  it('FONT_SOURCE defaults to "local" when not set', async () => {
    vi.stubEnv('VITE_APP_API_URL', 'http://localhost:8000');
    const { env } = await import('./env');
    expect(env.FONT_SOURCE).toBe('local');
  });

  it('FONT_SOURCE accepts "local" explicitly', async () => {
    vi.stubEnv('VITE_APP_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_FONT_SOURCE', 'local');
    const { env } = await import('./env');
    expect(env.FONT_SOURCE).toBe('local');
  });

  it('FONT_SOURCE accepts "google" explicitly', async () => {
    vi.stubEnv('VITE_APP_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_FONT_SOURCE', 'google');
    const { env } = await import('./env');
    expect(env.FONT_SOURCE).toBe('google');
  });

  it('FONT_SOURCE rejects invalid values', async () => {
    vi.stubEnv('VITE_APP_API_URL', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_FONT_SOURCE', 'bunny-cdn');
    await expect(import('./env')).rejects.toThrow(/FONT_SOURCE/);
  });
});
