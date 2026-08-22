import { authStorage } from './auth';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown; authenticated?: boolean };

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return undefined;
  try { return JSON.parse(text); } catch { return undefined; }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, authenticated = true, headers, ...init } = options;
  const token = authStorage.getToken();
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers: {
      ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (response.status === 401) {
    authStorage.clear();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login');
  }
  if (!response.ok) {
    const payload = await readJson(response) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message;
    const fallback = response.status === 429 ? 'Muitas tentativas. Aguarde alguns instantes e tente novamente.' : response.status >= 500 ? 'O serviço está temporariamente indisponível. Tente novamente mais tarde.' : 'Não foi possível concluir a solicitação.';
    throw new ApiError(message ?? fallback, response.status);
  }
  return await readJson(response) as T;
}

export async function apiDownload(path: string, fileName: string) {
  const token = authStorage.getToken();
  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 401) {
    authStorage.clear();
    if (typeof window !== 'undefined') window.location.assign('/login');
  }
  if (!response.ok) {
    const payload = await readJson(response) as { message?: string | string[] } | undefined;
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message;
    throw new ApiError(message ?? 'Não foi possível baixar o anexo.', response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
