import { ApiError } from '@/lib/api-client';

// Signup is allowed to disclose which field collided (the form has to tell the
// user the handle or email is taken); other flows stay enumeration-resistant.
export function signupFieldForError(
  error: unknown,
): 'username' | 'email' | null {
  if (!(error instanceof ApiError)) {
    return null;
  }
  if (error.errorCode === 'USERNAME_TAKEN') {
    return 'username';
  }
  if (error.errorCode === 'EMAIL_TAKEN') {
    return 'email';
  }
  return null;
}

// A wrong re-auth password on account deletion maps to the password field.
export function deleteAccountFieldForError(error: unknown): 'password' | null {
  if (error instanceof ApiError && error.errorCode === 'INVALID_PASSWORD') {
    return 'password';
  }
  return null;
}

// A wrong current password on the change-password form maps to that field;
// every other failure falls through to the global toast.
export function changePasswordFieldForError(
  error: unknown,
): 'currentPassword' | null {
  if (error instanceof ApiError && error.errorCode === 'INVALID_PASSWORD') {
    return 'currentPassword';
  }
  return null;
}

// On the change-email form a wrong password maps to currentPassword, and a
// taken or unchanged address maps to newEmail; anything else toasts.
export function changeEmailFieldForError(
  error: unknown,
): 'newEmail' | 'currentPassword' | null {
  if (!(error instanceof ApiError)) {
    return null;
  }
  if (error.errorCode === 'INVALID_PASSWORD') {
    return 'currentPassword';
  }
  if (
    error.errorCode === 'EMAIL_TAKEN' ||
    error.errorCode === 'EMAIL_UNCHANGED'
  ) {
    return 'newEmail';
  }
  return null;
}
