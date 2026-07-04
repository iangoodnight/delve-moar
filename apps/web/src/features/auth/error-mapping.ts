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
