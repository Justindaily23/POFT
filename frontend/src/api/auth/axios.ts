import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { tokenService } from "./tokenService";

interface ApiErrorResponse {
  code?: string;
  message?: string;
}

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface FailedRequest {
  resolve: (token: string) => void;
  reject: (error: AxiosError | Error) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

let onLogoutCallback: (() => void) | null = null;
let onMaintenanceCallback: (() => void) | null = null;

export const setLogoutHandler = (callback: () => void) => (onLogoutCallback = callback);
export const setMaintenanceHandler = (callback: () => void) => (onMaintenanceCallback = callback);

const processQueue = (error: AxiosError | Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
    else prom.reject(new Error("Session expired. Please log in again."));
  });
  failedQueue = [];
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  paramsSerializer: { indexes: null },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken() || localStorage.getItem("access_token");
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryAxiosRequestConfig;

    // 🔹 1. Maintenance check
    if (error.response?.status === 503) {
      if (onMaintenanceCallback) onMaintenanceCallback();
      return Promise.reject(error);
    }

    // 🔹 2. Token expired check with type safety
    const isTokenExpired =
      error.response?.status === 401 &&
      (error.response.data?.code === "TOKEN_EXPIRED" ||
        (typeof error.response.data?.message === "string" &&
          error.response.data.message.includes("expired")));

    if (isTokenExpired && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post<{ accessToken: string }>(
          "/auth/refresh",
          {},
          { withCredentials: true },
        );
        const newToken = data.accessToken;

        tokenService.setToken(newToken);
        processQueue(null, newToken);

        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        const finalError = refreshError instanceof Error ? refreshError : error;
        processQueue(finalError, null);

        tokenService.clearToken();
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
