/**
 * EcoMart Centralized API Service Client
 * Attaches Authorization header with JWT token automatically and handles 401/403 responses.
 */

export const getToken = () => {
  try {
    const authUserStr = localStorage.getItem("em_auth_user");
    if (authUserStr) {
      const parsed = JSON.parse(authUserStr);
      if (parsed && parsed.token) return parsed.token;
    }
  } catch {
    /* ignore */
  }

  const directToken = localStorage.getItem("token") || localStorage.getItem("fc_token") || sessionStorage.getItem("token");
  if (directToken) return directToken;

  return null;
};

export const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Auto set Content-Type to application/json if body is plain object and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If token expired or invalid on protected route, trigger custom auth error event
    window.dispatchEvent(new CustomEvent("ecomart_unauthorized"));
  }

  return response;
};

export const apiGet = async (url, options = {}) => {
  const res = await apiFetch(url, { ...options, method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} error`);
  }
  return data;
};

export const apiPost = async (url, body, options = {}) => {
  const isFormData = body instanceof FormData;
  const res = await apiFetch(url, {
    ...options,
    method: "POST",
    body: isFormData ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} error`);
  }
  return data;
};

export const apiPut = async (url, body, options = {}) => {
  const isFormData = body instanceof FormData;
  const res = await apiFetch(url, {
    ...options,
    method: "PUT",
    body: isFormData ? body : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} error`);
  }
  return data;
};

export const apiDelete = async (url, options = {}) => {
  const res = await apiFetch(url, { ...options, method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} error`);
  }
  return data;
};

export default {
  getToken,
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
};
