// API utility for making backend requests
// Uses NEXT_PUBLIC_BACKEND_URL in production, or relative paths in development

const getApiBaseUrl = (): string => {
  // In production (Vercel), use the backend URL from environment variable
  const backendUrl = import.meta.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    // Remove trailing slash if present
    return backendUrl.replace(/\/$/, '');
  }
  // In development, use relative paths (Vite proxy will handle it)
  return '';
};

export const apiBaseUrl = getApiBaseUrl();

/**
 * Makes an API request to the backend
 * @param endpoint - API endpoint (e.g., '/api/jobs/accept')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = apiBaseUrl ? `${apiBaseUrl}${normalizedEndpoint}` : normalizedEndpoint;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

