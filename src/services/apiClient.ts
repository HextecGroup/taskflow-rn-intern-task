import type { RemoteTask } from '../types';
import { SYNC_REQUEST_TIMEOUT_MS } from '../utils/constants';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init: RequestInit = {}, timeoutMs = SYNC_REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
    });
    if (!response.ok) {
      throw new ApiError(`Server responded with ${response.status}`, response.status);
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw new ApiError('Server unreachable - is json-server running and the URL correct?');
  } finally {
    clearTimeout(timer);
  }
}

/** Thin REST client for the json-server `/tasks` resource. */
export const tasksApi = {
  list: (baseUrl: string): Promise<unknown> => request<unknown>(`${baseUrl}/tasks`),

  create: (baseUrl: string, task: RemoteTask): Promise<unknown> =>
    request(`${baseUrl}/tasks`, { method: 'POST', body: JSON.stringify(task) }),

  update: (baseUrl: string, task: RemoteTask): Promise<unknown> =>
    request(`${baseUrl}/tasks/${encodeURIComponent(task.id)}`, { method: 'PUT', body: JSON.stringify(task) }),

  remove: async (baseUrl: string, id: string): Promise<void> => {
    try {
      await request(`${baseUrl}/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (error) {
      // Already gone on the server - the desired end state is reached.
      if (error instanceof ApiError && error.status === 404) return;
      throw error;
    }
  },

  /** Returns round-trip latency in ms. */
  ping: async (baseUrl: string): Promise<number> => {
    const started = Date.now();
    await request(`${baseUrl}/tasks?_limit=1`, {}, 5_000);
    return Date.now() - started;
  },
};
