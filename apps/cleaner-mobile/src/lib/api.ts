import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

const ACCESS_KEY = 'freshly_access_token';
const REFRESH_KEY = 'freshly_refresh_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Native clients have no cookie jar, so the access/refresh tokens returned
// in the auth endpoints' response bodies are kept in the OS secure keychain
// (Keychain on iOS, Keystore on Android) instead of the httpOnly cookies the
// web app relies on. Same server, same session model, different transport.
//
// expo-secure-store has no web implementation (there is no OS keychain in a
// browser) — `expo start --web` is a dev convenience, not a shipped target,
// so we fall back to localStorage there rather than crash.
const isWeb = Platform.OS === 'web';

export const tokenStore = {
  async getAccess(): Promise<string | null> {
    return isWeb ? localStorage.getItem(ACCESS_KEY) : SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh(): Promise<string | null> {
    return isWeb ? localStorage.getItem(REFRESH_KEY) : SecureStore.getItemAsync(REFRESH_KEY);
  },
  async set(accessToken: string, refreshToken: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(ACCESS_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
      return;
    }
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async clear(): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await tokenStore.getRefresh();
      if (!refreshToken) return false;
      try {
        const res = await fetch(API_BASE + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-client': 'native' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          await tokenStore.clear();
          return false;
        }
        const data = await res.json();
        await tokenStore.set(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Native clients receive the raw access/refresh tokens in the response
    // body (the backend omits them for browser clients). This header tells
    // the server which transport we are.
    'x-client': 'native',
  };
  const accessToken = await tokenStore.getAccess();
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — please check your connection and try again.', 0);
  }

  if (res.status === 401 && !isRetry && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(method, path, body, true);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};
