import { ApiError } from '@/lib/api-client';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

// Form-level message for any auth failure. The API's userMessage is already
// human-facing (invalid credentials, rate limited, etc.); fall back only when
// the error is not a structured ApiError.
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.userMessage !== '') {
    return error.userMessage;
  }
  return FALLBACK_MESSAGE;
}

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
