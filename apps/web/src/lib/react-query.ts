import type { DefaultOptions, UseMutationOptions } from '@tanstack/react-query';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      // When true, the global error toast is skipped because the caller shows
      // the error itself (e.g. as a page state).
      readonly suppressErrorToast?: boolean;
    };
  }
}

export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: 1, // retry failed requests once
    staleTime: 5 * 60 * 1_000, // five minutes
  },
} satisfies DefaultOptions;

export type ApiFnReturnType<
  FnType extends (...args: never[]) => Promise<unknown>,
> = Awaited<ReturnType<FnType>>;

export type QueryConfig<T extends (...args: never[]) => unknown> = Omit<
  ReturnType<T>,
  'queryKey' | 'queryFn'
>;

export type MutationConfig<
  MutationFnType extends (...args: never[]) => Promise<unknown>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error,
  Parameters<MutationFnType>[0]
>;
