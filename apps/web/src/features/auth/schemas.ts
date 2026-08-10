import { z } from 'zod';

// Mirror the server's rules (apps/api/app/schemas/auth.py) for fast client
// feedback. The server stays the source of truth; it also enforces a reserved
// username denylist we deliberately do not replicate here.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

const username = z
  .string()
  .min(
    USERNAME_MIN_LENGTH,
    `Use at least ${String(USERNAME_MIN_LENGTH)} characters.`,
  )
  .max(
    USERNAME_MAX_LENGTH,
    `Use at most ${String(USERNAME_MAX_LENGTH)} characters.`,
  )
  .regex(
    USERNAME_PATTERN,
    'Use lowercase letters, numbers, hyphen, and underscore only.',
  );

const newPassword = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Use at least ${String(PASSWORD_MIN_LENGTH)} characters.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Use at most ${String(PASSWORD_MAX_LENGTH)} characters.`,
  );

function passwordsMatch(data: {
  readonly password: string;
  readonly confirmPassword: string;
}): boolean {
  return data.password === data.confirmPassword;
}

// Not `as const`: zod's refine wants a mutable `path` array.
const PASSWORD_MISMATCH = {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
};

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Enter your username or email.'),
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    username,
    email: z.email('Enter a valid email address.'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, PASSWORD_MISMATCH);
export type SignupValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Enter your username or email.'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, PASSWORD_MISMATCH);
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// Changing the password re-authenticates with the current one (present-only;
// the server verifies it), then applies the new password with the shared rules.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match.',
    path: ['confirmNewPassword'],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

// Changing the email re-authenticates with the current password (present-only).
export const changeEmailSchema = z.object({
  newEmail: z.email('Enter a valid email address.'),
  currentPassword: z.string().min(1, 'Enter your current password.'),
});
export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;

// Deleting the account re-authenticates with the current password. It only
// needs to be present; the server verifies it (no length rules here, since
// older passwords may predate the current minimum).
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password.'),
});
export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;
