import type { components } from '@delve-moar/api-types';
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type User = components['schemas']['UserResponse'];
export type SignupRequest = components['schemas']['SignupRequest'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type PasswordResetRequest =
  components['schemas']['PasswordResetRequest'];
export type PasswordResetConfirmRequest =
  components['schemas']['PasswordResetConfirmRequest'];
export type VerifyEmailRequest = components['schemas']['VerifyEmailRequest'];
export type MessageResponse = components['schemas']['MessageResponse'];

// Single source of truth for the cached current-user identity. The auth
// context reads this key; the mutations below keep it in sync.
export const USER_QUERY_KEY = ['auth', 'me'] as const;

// The session cookie is HttpOnly, but the API sets a readable dm_csrf cookie
// alongside it. Its presence is our signal that a session may exist.
function hasSessionCookie(): boolean {
  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith('dm_csrf='));
}

// Resolves null (no network) when there is no session cookie, so anonymous
// visitors -- and tests -- never hit /me. Checking the cookie inside the
// queryFn keeps it reactive: it is re-evaluated on every (re)fetch rather
// than frozen at a render, unlike a render-time `enabled` gate.
export function getCurrentUser(): Promise<User | null> {
  if (!hasSessionCookie()) {
    return Promise.resolve(null);
  }
  return apiClient.get<User>('/v1/auth/me');
}

export function getCurrentUserQueryOptions() {
  return queryOptions({
    queryKey: USER_QUERY_KEY,
    queryFn: getCurrentUser,
    // A 401 means "not signed in", not a transient failure worth retrying.
    retry: false,
    // Settle synchronously as signed-out with no cookie, so anonymous loads
    // never flash a loading state and make no request.
    initialData: hasSessionCookie() ? undefined : null,
  });
}

export function signup(data: SignupRequest): Promise<User> {
  return apiClient.post<User>('/v1/auth/signup', data);
}

export function login(data: LoginRequest): Promise<User> {
  return apiClient.post<User>('/v1/auth/login', data);
}

export async function logout(): Promise<void> {
  await apiClient.post('/v1/auth/logout');
}

export async function verifyEmail(data: VerifyEmailRequest): Promise<void> {
  await apiClient.post('/v1/auth/verify-email', data);
}

export async function resendVerification(): Promise<void> {
  await apiClient.post('/v1/auth/resend-verification');
}

export function requestPasswordReset(
  data: PasswordResetRequest,
): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>('/v1/auth/password-reset', data);
}

export async function resetPassword(
  data: PasswordResetConfirmRequest,
): Promise<void> {
  await apiClient.post('/v1/auth/password-reset/confirm', data);
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signup,
    onSuccess: (user) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Session is revoked server-side. Write null straight into the cache so
      // the UI flips to signed-out immediately. removeQueries would instead
      // leave the active observer to refetch /me, which races cookie clearing
      // and can momentarily re-authenticate the header.
      queryClient.setQueryData(USER_QUERY_KEY, null);
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyEmail,
    // The panel renders the result (verifying/verified/invalid) inline, so the
    // global error toast would be redundant.
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      // If a session exists, emailVerified just flipped; refetch /me.
      void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}

export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      // Confirming a reset revokes every session; force a fresh sign-in.
      queryClient.setQueryData(USER_QUERY_KEY, null);
    },
  });
}
