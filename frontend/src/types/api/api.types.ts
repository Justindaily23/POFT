import type { RoleName } from "@/enums/roles";
import { AxiosError } from "axios";

export interface AuthUser {
  id: string;
  email: string;
  role: RoleName;
  name: string;
  mustChangePassword: boolean;
  permissions?: string[]; // Optional if you use them later
}

export interface LoginResponse extends AuthUser {
  accessToken: string; // NestJS usually returns 'accessToken' or 'access_token'
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Reusable Axios Error shape
export interface ApiError {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Standard shape of error responses from your NestJS backend.
 */
export interface BackendErrorData {
  message?: string | string[];
  requiresContract?: boolean;
  poLineId?: string | number;
  error?: string;
  statusCode?: number;
}

/**
 * Custom Error type used throughout the frontend to retain extra metadata.
 */
export interface EnhancedError extends Error {
  requiresContract?: boolean;
  poLineId?: string | number;
}

// ADD THIS EXPORT:
/**
 * A type-safe AxiosError that includes your specific BackendErrorData.
 */
export type AppAxiosError = AxiosError<BackendErrorData>;

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean; // ✅ Add this line (optional or required)
}

export interface AxiosMaintenanceError {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
}
