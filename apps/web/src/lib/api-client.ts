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

function onRequest(config: InternalAxiosRequestConfig) {
  // TODO(Phase 1b): attach auth header from session store once auth lands.
  config.headers.Accept = 'application/json';
  return config;
}

export const apiClient = axios.create({
  baseURL: env.API_URL,
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
