import { API_BASE_URL } from './config';

export function resolveApiAssetUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    return new URL(url, `${API_BASE_URL}/`).toString();
  } catch {
    return null;
  }
}
