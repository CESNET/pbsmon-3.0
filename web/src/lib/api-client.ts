import { ApiClient } from "./generated-api";
import type { ApiRequestOptions } from "./generated-api/core/ApiRequestOptions";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:4000");

export const normalizedBaseUrl = API_BASE_URL.endsWith("/")
  ? API_BASE_URL.slice(0, -1)
  : API_BASE_URL;

// Global state for impersonation (updated by ImpersonationContext)
let impersonatedUsername: string | null = null;

export function setImpersonatedUsername(username: string | null) {
  impersonatedUsername = username;
}

export function getImpersonatedUsername(): string | null {
  return impersonatedUsername;
}

export function getImpersonationHeaders(
  _options: ApiRequestOptions
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (impersonatedUsername) {
    headers["X-Impersonate-User"] = impersonatedUsername;
  }
  return Promise.resolve(headers);
}

export const apiClient = new ApiClient({
  BASE: normalizedBaseUrl,
  WITH_CREDENTIALS: true,
  CREDENTIALS: "include",
  HEADERS: getImpersonationHeaders,
});

export * from "./generated-api";
