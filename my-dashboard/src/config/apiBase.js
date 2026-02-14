const explicitBase = String(import.meta.env.VITE_API_BASE ?? '').trim();
const normalizedBase = explicitBase.replace(/\/+$/, '');
const invalidBase = normalizedBase === 'undefined' || normalizedBase === 'null';

function canUseExplicitBase(base) {
  if (!base || invalidBase) return false;

  try {
    const parsed = new URL(base);
    const hostname = parsed.hostname.toLowerCase();
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

    if (!import.meta.env.DEV && isLocalHost) return false;

    if (
      !import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      parsed.protocol === 'http:'
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export const API_BASE = canUseExplicitBase(normalizedBase)
  ? normalizedBase
  : (import.meta.env.DEV ? 'http://localhost:4000' : '');

export async function apiFetchJson(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');
    const data = isJson ? await response.json() : null;
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: null, error };
  }
}
