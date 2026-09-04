const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const api = async (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});

  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('unauthorized'));
    }
    let message = 'An error occurred';
    try {
      const data = await res.json();
      message = data.message || message;
    } catch { }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return null;

  return res.json();
};
