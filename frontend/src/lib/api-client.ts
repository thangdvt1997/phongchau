import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const ACCESS_TOKEN_KEY = 'pc_access_token';
const REFRESH_TOKEN_KEY = 'pc_refresh_token';
const CART_SESSION_KEY = 'pc_cart_session';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getCartSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CART_SESSION_KEY);
}

export function setCartSessionId(sessionId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_SESSION_KEY, sessionId);
}

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const cartSession = getCartSessionId();
  if (cartSession) {
    config.headers.set('x-cart-session', cartSession);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const sessionHeader = response.headers['x-cart-session'];
    if (sessionHeader) {
      setCartSessionId(sessionHeader);
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original?._retry && getRefreshToken()) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: getRefreshToken(),
        });
        setTokens(data.accessToken, data.refreshToken);
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch {
        clearTokens();
      }
    }
    return Promise.reject(error);
  },
);
