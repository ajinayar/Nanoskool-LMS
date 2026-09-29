import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

/**
 * Access tokens live only in memory. The refresh token is an httpOnly cookie
 * the browser sends to /api/auth/refresh, so page scripts never see it.
 */
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((r) => {
        setAccessToken(r.data.accessToken);
        return r.data.accessToken as string;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? '';
    if (error.response?.status === 401 && original && !original._retried && !url.includes('/auth/')) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      onSessionExpired?.();
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from an API error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as AxiosError<{ error?: { message?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } } }>;
  const data = e?.response?.data?.error;
  if (data?.details?.fieldErrors) {
    const first = Object.entries(data.details.fieldErrors).find(([, v]) => v?.length);
    if (first) return `${first[0]}: ${first[1][0]}`;
  }
  if (data?.details?.formErrors?.length) return data.details.formErrors[0];
  if (data?.message) return data.message;
  // No JSON error from the API: the dev proxy could not reach it, or it is down
  if (e?.message === 'Network Error' || !e?.response || (e.response.status >= 500 && !data)) {
    return 'Cannot reach the Nanoskool server. Make sure the API is running (npm run dev in the server folder) and MongoDB is started.';
  }
  return fallback;
}

export async function uploadFile(file: File, folder: string): Promise<{ url: string; name: string }> {
  const form = new FormData();
  form.append('file', file);
  const r = await api.post(`/uploads?folder=${folder}`, form);
  return r.data;
}
