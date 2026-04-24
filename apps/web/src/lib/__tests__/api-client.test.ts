import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';

import { apiClient, ApiError } from '../api-client';

describe('apiClient', () => {
  const mock = new MockAdapter(apiClient);

  afterEach(() => {
    mock.reset();
  });

  it('passes through 2xx responses untouched', async () => {
    mock.onGet('/health').reply(200, { status: 'ok', version: '0.0.0' });
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'ok', version: '0.0.0' });
  });

  it('uses env.API_URL as baseURL', () => {
    // env.API_URL is resolved at import time from VITE_APP_API_URL.
    // We only assert the client exposes a non-empty string, to avoid coupling
    // the test to a specific env value.
    expect(typeof apiClient.defaults.baseURL).toBe('string');
    expect(apiClient.defaults.baseURL).not.toBe('');
  });

  it('wraps an ErrorResponse envelope into an ApiError with matching fields', async () => {
    const envelope = {
      status: 404,
      developerMessage: 'Item not found: flame-tongue',
      userMessage: 'That item could not be found.',
      errorCode: 'item_not_found',
      moreInfo: 'https://docs.example.com/errors/item_not_found',
    };
    mock.onGet('/v1/items/flame-tongue').reply(404, envelope);

    await expect(apiClient.get('/v1/items/flame-tongue')).rejects.toMatchObject(
      {
        name: 'ApiError',
        status: 404,
        errorCode: 'item_not_found',
        developerMessage: envelope.developerMessage,
        userMessage: envelope.userMessage,
        moreInfo: envelope.moreInfo,
      },
    );
  });

  it('wraps HTTPValidationError 422 as ApiError with errorCode "validation_error"', async () => {
    mock.onGet('/v1/items/bad').reply(422, {
      detail: [
        {
          loc: ['query', 'namespace'],
          msg: 'field required',
          type: 'value_error.missing',
        },
      ],
    });

    let caught: unknown;
    try {
      await apiClient.get('/v1/items/bad');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const err = caught as ApiError;
    expect(err.status).toBe(422);
    expect(err.errorCode).toBe('validation_error');
    expect(err.developerMessage).toContain('query.namespace');
    expect(err.developerMessage).toContain('field required');
  });

  it('wraps network errors as ApiError with status 0 and errorCode "unknown_error"', async () => {
    mock.onGet('/v1/items/x').networkError();

    let caught: unknown;
    try {
      await apiClient.get('/v1/items/x');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const err = caught as ApiError;
    expect(err.status).toBe(0);
    expect(err.errorCode).toBe('unknown_error');
  });

  it('ApiError is an instance of Error', () => {
    const err = new ApiError({
      status: 500,
      errorCode: 'boom',
      developerMessage: 'dev',
      userMessage: 'user',
      moreInfo: '',
      envelope: null,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('user');
  });
});
