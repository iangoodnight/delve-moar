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

export function getCurrentUser(): Promise<User> {
  return apiClient.get<User>('/v1/auth/me');
}

export function getCurrentUserQueryOptions() {
  return queryOptions({
    queryKey: USER_QUERY_KEY,
    queryFn: getCurrentUser,
    // A 401 means "not signed in", not a transient failure worth retrying.
    retry: false,
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
      // Session is revoked server-side; drop the cached identity so the UI
      // reflects signed-out state without waiting on a refetch.
      queryClient.removeQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      // If a session exists, emailVerified just flipped; refetch /me. A no-op
      // when the query is disabled (verifying from an email in a fresh tab).
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
      queryClient.removeQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}
