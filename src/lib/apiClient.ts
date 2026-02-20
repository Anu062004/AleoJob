type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestOptions {
  method?: ApiMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiErrorPayload {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

const missingRouteCache = new Set<string>();
const LOCAL_API_FALLBACK = 'http://localhost:3101';

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isLocalBase(base: string): boolean {
  try {
    const parsed = new URL(base);
    return isLocalHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export class ApiRequestError extends Error {
  status?: number;
  payload?: ApiErrorPayload | string;

  constructor(message: string, status?: number, payload?: ApiErrorPayload | string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

function getApiBaseCandidates(): string[] {
  const configuredBases = [
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.NEXT_PUBLIC_API_BASE_URL,
    import.meta.env.VITE_BACKEND_URL,
    import.meta.env.NEXT_PUBLIC_BACKEND_URL,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  const candidates: string[] = [''];

  if (typeof window !== 'undefined' && isLocalHostname(window.location.hostname)) {
    // In local dev prefer local API only, to avoid silently falling back to stale remote deployments.
    const allowRemoteFallback = String(import.meta.env.NEXT_PUBLIC_ALLOW_REMOTE_API_FALLBACK || '').toLowerCase() === 'true';

    candidates.push(LOCAL_API_FALLBACK);
    candidates.push(...configuredBases.filter((base) => isLocalBase(base)));

    if (allowRemoteFallback) {
      candidates.push(...configuredBases.filter((base) => !isLocalBase(base)));
    }
  } else {
    candidates.push(...configuredBases);
  }

  return [...new Set(candidates)];
}

function buildUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;
  return `${base.replace(/\/+$/, '')}${normalizedPath}`;
}

async function parseResponse(response: Response): Promise<ApiErrorPayload | string | null> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}

function getPayloadMessage(payload: ApiErrorPayload | string | null): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') {
    return payload.trim() || null;
  }
  return payload.message || payload.error || null;
}

function isRouteNotFoundMessage(message: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('route post') && lower.includes('not found');
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (missingRouteCache.has(path)) {
    throw new ApiRequestError(`API route not found for ${path}`, 404, { message: `Route not found for ${path}` });
  }

  const candidates = getApiBaseCandidates();
  let lastError: Error | null = null;
  let lastApiError: ApiRequestError | null = null;
  const routeNotFoundUrls: string[] = [];

  for (const base of candidates) {
    const url = buildUrl(base, path);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      const payload = await parseResponse(response);
      const payloadMessage = getPayloadMessage(payload);

      if (!response.ok) {
        // Try next candidate for route-missing responses on local development.
        if (response.status === 404 && isRouteNotFoundMessage(payloadMessage)) {
          routeNotFoundUrls.push(url);
          continue;
        }

        // Vite proxy can return generic 5xx with empty/plain payload when local API target is down.
        // In that case, continue to the next configured base URL.
        if (
          !base &&
          response.status >= 500 &&
          (!payloadMessage || payloadMessage.toLowerCase() === 'internal server error')
        ) {
          continue;
        }

        throw new ApiRequestError(
          payloadMessage || `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          payload || undefined
        );
      }

      return (payload as T) ?? ({} as T);
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError instanceof ApiRequestError) {
        lastApiError = lastError;
      }
    }
  }

  if (lastApiError) {
    throw lastApiError;
  }

  if (routeNotFoundUrls.length > 0) {
    missingRouteCache.add(path);
    throw new ApiRequestError(
      `API route not found for ${path}. Tried: ${routeNotFoundUrls.join(', ')}`,
      404,
      { message: `Route not found for ${path}`, attempted: routeNotFoundUrls }
    );
  }

  throw new ApiRequestError(lastError?.message || 'Unable to reach API server');
}
