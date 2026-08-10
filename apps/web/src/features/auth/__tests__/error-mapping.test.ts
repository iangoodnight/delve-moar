import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-client';

import {
  changeEmailFieldForError,
  changePasswordFieldForError,
  signupFieldForError,
} from '../error-mapping';

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

describe('changePasswordFieldForError', () => {
  it('maps INVALID_PASSWORD to the currentPassword field', () => {
    expect(changePasswordFieldForError(apiError('INVALID_PASSWORD'))).toBe(
      'currentPassword',
    );
  });

  it('returns null for other error codes', () => {
    expect(changePasswordFieldForError(apiError('EMAIL_TAKEN'))).toBeNull();
  });

  it('returns null for a non-ApiError', () => {
    expect(changePasswordFieldForError(new Error('x'))).toBeNull();
  });
});

describe('changeEmailFieldForError', () => {
  it('maps INVALID_PASSWORD to the currentPassword field', () => {
    expect(changeEmailFieldForError(apiError('INVALID_PASSWORD'))).toBe(
      'currentPassword',
    );
  });

  it('maps EMAIL_TAKEN to the newEmail field', () => {
    expect(changeEmailFieldForError(apiError('EMAIL_TAKEN'))).toBe('newEmail');
  });

  it('maps EMAIL_UNCHANGED to the newEmail field', () => {
    expect(changeEmailFieldForError(apiError('EMAIL_UNCHANGED'))).toBe(
      'newEmail',
    );
  });

  it('returns null for other error codes', () => {
    expect(changeEmailFieldForError(apiError('INVALID_TOKEN'))).toBeNull();
  });

  it('returns null for a non-ApiError', () => {
    expect(changeEmailFieldForError(new Error('x'))).toBeNull();
  });
});
