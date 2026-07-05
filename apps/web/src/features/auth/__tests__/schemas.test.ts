import { describe, expect, it } from 'vitest';

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '../schemas';

describe('loginSchema', () => {
  it('accepts a non-empty identifier and password', () => {
    expect(
      loginSchema.safeParse({ identifier: 'mara', password: 'x' }).success,
    ).toBe(true);
  });

  it('rejects empty fields', () => {
    expect(
      loginSchema.safeParse({ identifier: '', password: '' }).success,
    ).toBe(false);
  });
});

describe('signupSchema', () => {
  const base = {
    username: 'mara',
    email: 'mara@example.com',
    password: 'longenough',
    confirmPassword: 'longenough',
  };

  it('accepts a valid signup', () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an uppercase username', () => {
    expect(signupSchema.safeParse({ ...base, username: 'Mara' }).success).toBe(
      false,
    );
  });

  it('rejects a too-short username', () => {
    expect(signupSchema.safeParse({ ...base, username: 'ma' }).success).toBe(
      false,
    );
  });

  it('rejects a too-short password', () => {
    expect(
      signupSchema.safeParse({
        ...base,
        password: 'short',
        confirmPassword: 'short',
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(signupSchema.safeParse({ ...base, email: 'nope' }).success).toBe(
      false,
    );
  });

  it('reports a mismatch on the confirmPassword field', () => {
    const result = signupSchema.safeParse({
      ...base,
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path[0] === 'confirmPassword',
        ),
      ).toBe(true);
    }
  });
});

describe('resetPasswordSchema', () => {
  it('requires matching passwords', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'longenough',
        confirmPassword: 'different',
      }).success,
    ).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('requires an identifier', () => {
    expect(forgotPasswordSchema.safeParse({ identifier: '' }).success).toBe(
      false,
    );
  });
});
