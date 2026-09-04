export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    // If the frontend is loaded via 127.0.0.1, match it; otherwise use localhost
    const host = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
    return `http://${host}:8000/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
};

export class RequestError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  
  let data: any = null;
  if (isJson) {
    try {
      data = await response.json();
    } catch {
      throw new RequestError('Malformed JSON response received from backend API.', 'MALFORMED_RESPONSE', response.status);
    }
  } else {
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorCode = data?.error?.code || (response.status === 404 ? 'NOT_FOUND' : (response.status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR'));
    const errorMessage = data?.error?.message || `Request failed with HTTP ${response.status}: ${response.statusText || 'Error'}`;
    throw new RequestError(errorMessage, errorCode, response.status);
  }

  // Handle standard IdeaForge API envelope: { success: true, data: [...] }
  if (data && typeof data === 'object') {
    if ('data' in data && !('total' in data) && !('page' in data)) {
      return data.data as T;
    }
    return data as T;
  }
  return data as T;
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      return await handleResponse<T>(response);
    } catch (error: any) {
      if (error instanceof RequestError) throw error;
      const isNetworkFail = error instanceof TypeError || error?.name === 'TypeError' || error?.message?.includes('fetch');
      throw new RequestError(
        isNetworkFail 
          ? `Cannot connect to IdeaForge backend at ${url}. Please verify the backend server is running on port 8000.`
          : (error?.message || 'Network request failed.'),
        'BACKEND_UNAVAILABLE',
        0
      );
    }
  },

  async post<T>(endpoint: string, body: FormData | any, isMultipart = false): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      let finalBody: any = body;

      if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
        finalBody = JSON.stringify(body);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: finalBody
      });
      return await handleResponse<T>(response);
    } catch (error: any) {
      if (error instanceof RequestError) throw error;
      const isNetworkFail = error instanceof TypeError || error?.name === 'TypeError' || error?.message?.includes('fetch');
      throw new RequestError(
        isNetworkFail 
          ? `Cannot connect to IdeaForge backend at ${url}. Please verify the backend server is running on port 8000.`
          : (error?.message || 'Network request failed.'),
        'BACKEND_UNAVAILABLE',
        0
      );
    }
  },

  async delete<T>(endpoint: string): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });
      return await handleResponse<T>(response);
    } catch (error: any) {
      if (error instanceof RequestError) throw error;
      const isNetworkFail = error instanceof TypeError || error?.name === 'TypeError' || error?.message?.includes('fetch');
      throw new RequestError(
        isNetworkFail 
          ? `Cannot connect to IdeaForge backend at ${url}. Please verify the backend server is running on port 8000.`
          : (error?.message || 'Network request failed.'),
        'BACKEND_UNAVAILABLE',
        0
      );
    }
  },

  async patch<T>(endpoint: string, body: any): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });
      return await handleResponse<T>(response);
    } catch (error: any) {
      if (error instanceof RequestError) throw error;
      const isNetworkFail = error instanceof TypeError || error?.name === 'TypeError' || error?.message?.includes('fetch');
      throw new RequestError(
        isNetworkFail 
          ? `Cannot connect to IdeaForge backend at ${url}. Please verify the backend server is running on port 8000.`
          : (error?.message || 'Network request failed.'),
        'BACKEND_UNAVAILABLE',
        0
      );
    }
  }
};
