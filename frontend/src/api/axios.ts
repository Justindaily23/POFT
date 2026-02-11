import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { tokenService } from "./tokenService";
//import qs from 'qs';

/**
 * Explicitly define the Backend Error structure
 */
interface ApiErrorResponse {
  code?: string;
  message?: string;
}

/**
 * Extend Axios config to include the retry flag explicitly
 */
interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: AxiosError | Error) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

// Storage for the logout callback to keep it environment-agnostic
let onLogoutCallback: (() => void) | null = null;

export const setLogoutHandler = (callback: () => void) => {
  onLogoutCallback = callback;
};

/**
 * Rejects or Resolves queued requests.
 * Uses the original error if a fallback is needed to maintain consistency.
 */
const processQueue = (error: AxiosError | Error | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    } else {
      prom.reject(new Error("Session expired. Please log in again."));
    }
  });
  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  //     paramsSerializer: {
  //     serialize: (params) => qs.stringify(params, { arrayFormat: 'repeat' })
  //     // Result: ?poTypes=CAPEX&poTypes=OPEX (no brackets)
  // }
  paramsSerializer: {
    indexes: null, // this removes the brackets!
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken() || localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryAxiosRequestConfig;

    // Use structured data check instead of 'any'
    const isTokenExpired =
      error.response?.status === 401 && error.response.data?.code === "TOKEN_EXPIRED";

    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.accessToken;
        tokenService.setToken(newToken);
        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Pass the actual refresh error down the queue
        const finalError = refreshError instanceof Error ? refreshError : error;
        processQueue(finalError, null);

        tokenService.clearToken();

        // Use abstract callback instead of browser-specific window.dispatchEvent
        if (onLogoutCallback) onLogoutCallback();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
