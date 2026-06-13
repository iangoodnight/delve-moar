import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-client';

import { authErrorMessage, signupFieldForError } from '../error-mapping';

function apiError(errorCode: string, userMessage = 'A message.'): ApiError {
  return new ApiError({
    status: 400,
    errorCode,
    developerMessage: 'dev',
    userMessage,
    moreInfo: '',
    envelope: null,
  });
}

describe('authErrorMessage', () => {
  it('returns the ApiError userMessage', () => {
    expect(authErrorMessage(apiError('X', 'Bad credentials.'))).toBe(
      'Bad credentials.',
    );
  });

  it('falls back for a non-ApiError', () => {
    expect(authErrorMessage(new Error('boom'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('falls back when the userMessage is empty', () => {
    expect(authErrorMessage(apiError('X', ''))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

describe('signupFieldForError', () => {
  it('maps USERNAME_TAKEN to the username field', () => {
    expect(signupFieldForError(apiError('USERNAME_TAKEN'))).toBe('username');
  });

  it('maps EMAIL_TAKEN to the email field', () => {
    expect(signupFieldForError(apiError('EMAIL_TAKEN'))).toBe('email');
  });

  it('returns null for other error codes', () => {
    expect(signupFieldForError(apiError('INVALID_CREDENTIALS'))).toBeNull();
  });

  it('returns null for a non-ApiError', () => {
    expect(signupFieldForError(new Error('x'))).toBeNull();
  });
});
