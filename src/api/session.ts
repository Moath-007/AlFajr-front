const ACCESS_TOKEN_KEY = 'alfajr_access_token';

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearApiSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function subscribeToUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function notifyUnauthorized(): void {
  clearApiSession();
  unauthorizedListeners.forEach((listener) => listener());
}
