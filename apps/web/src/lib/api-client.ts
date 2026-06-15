import type { components } from '@delve-moar/api-types';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/config/env';

type ErrorResponse = components['schemas']['ErrorResponse'];
type HTTPValidationError = components['schemas']['HTTPValidationError'];

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly developerMessage: string;
  readonly userMessage: string;
  readonly moreInfo: string;
  readonly envelope: ErrorResponse | HTTPValidationError | null;

  constructor(init: {
    status: number;
    errorCode: string;
    developerMessage: string;
    userMessage: string;
    moreInfo: string;
    envelope: ErrorResponse | HTTPValidationError | null;
  }) {
    super(init.userMessage || init.developerMessage);
    this.name = 'ApiError';
    this.status = init.status;
    this.errorCode = init.errorCode;
    this.developerMessage = init.developerMessage;
    this.userMessage = init.userMessage;
    this.moreInfo = init.moreInfo;
    this.envelope = init.envelope;
  }
}

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

// A human-facing message for any thrown error. ApiError already carries a
// user-facing message from the API; everything else falls back to a generic.
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.userMessage !== '') {
    return error.userMessage;
  }
  return FALLBACK_ERROR_MESSAGE;
}

// Error codes that the forms surface inline at the field, so the global error
// toast skips them to avoid showing the same problem twice.
export const INLINE_FIELD_ERROR_CODES = new Set([
  'USERNAME_TAKEN',
  'EMAIL_TAKEN',
  'validation_error',
]);

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate['status'] === 'number' &&
    typeof candidate['developerMessage'] === 'string' &&
    typeof candidate['userMessage'] === 'string' &&
    typeof candidate['errorCode'] === 'string' &&
    typeof candidate['moreInfo'] === 'string'
  );
}

function isHTTPValidationError(body: unknown): body is HTTPValidationError {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return Array.isArray(candidate['detail']);
}

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const body: unknown = error.response?.data;

  if (isErrorResponse(body)) {
    return new ApiError({
      status: body.status,
      errorCode: body.errorCode,
      developerMessage: body.developerMessage,
      userMessage: body.userMessage,
      moreInfo: body.moreInfo,
      envelope: body,
    });
  }

  if (isHTTPValidationError(body)) {
    const detail = body.detail ?? [];
    const developerMessage =
      detail.length > 0
        ? detail.map((v) => `${v.loc.join('.')}: ${v.msg}`).join('; ')
        : 'Request validation failed';
    return new ApiError({
      status,
      errorCode: 'validation_error',
      developerMessage,
      userMessage: 'The request was invalid.',
      moreInfo: '',
      envelope: body,
    });
  }

  return new ApiError({
    status,
    errorCode: 'unknown_error',
    developerMessage: error.message,
    userMessage: 'Something went wrong. Please try again.',
    moreInfo: '',
    envelope: null,
  });
}

// Auth uses cookie sessions with double-submit CSRF: the API sets a
// readable `dm_csrf` cookie whose value the SPA echoes in this header on
// state-changing requests (see apps/api/app/auth/csrf.py).
const CSRF_COOKIE_NAME = 'dm_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return null;
}

function onRequest(config: InternalAxiosRequestConfig) {
  config.headers.Accept = 'application/json';
  // Echo the CSRF cookie on mutating requests. Missing cookie -> no header,
  // which the API rejects with 403 on the endpoints that require it.
  const method = config.method?.toLowerCase();
  if (method !== undefined && MUTATING_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken !== null) {
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }
  return config;
}

export const apiClient = axios.create({
  baseURL: env.API_URL,
  // Send and receive the session/CSRF cookies on cross-origin API calls.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(onRequest);
apiClient.interceptors.response.use(
  // axios.d.ts augments AxiosInstance.get<T> etc. to return Promise<T>
  // (the unwrapped body). The T contract is established at call sites.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  (response) => response.data,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(toApiError(error));
    }
    return Promise.reject(
      new ApiError({
        status: 0,
        errorCode: 'unknown_error',
        developerMessage:
          error instanceof Error ? error.message : String(error),
        userMessage: 'Something went wrong. Please try again.',
        moreInfo: '',
        envelope: null,
      }),
    );
  },
);
