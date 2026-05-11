// Module augmentation for axios.
//
// Our `apiClient` response interceptor unwraps `response.data` on the success
// path, so callers receive the body directly rather than an `AxiosResponse`.
// These overloads make the declared return types match runtime: `Promise<T>`
// instead of `Promise<AxiosResponse<T>>`. Augmentation overloads are merged
// before axios's originals, so TypeScript picks ours first when both match.
import type { AxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface AxiosInstance {
    request<T = unknown, D = unknown>(
      config: AxiosRequestConfig<D>,
    ): Promise<T>;
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    head<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    options<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>,
    ): Promise<T>;
    put<T = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>,
    ): Promise<T>;
    patch<T = unknown, D = unknown>(
      url: string,
      data?: D,
      config?: AxiosRequestConfig<D>,
    ): Promise<T>;
  }
}
