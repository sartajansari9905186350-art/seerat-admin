/**
 * SEERAT Admin API Client
 * Production-ready HTTP client connected to the Node.js / Express REST API.
 * Handles JWT authentication, request/response standardization, and session expiration.
 */

const API_BASE_URL = 'https://seerat-backend.onrender.com/api/admin';

const TOKEN_KEY = 'seerat_admin_jwt';
const ADMIN_DATA_KEY = 'seerat_admin_profile';

const Api = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },

  setToken(token, remember = false) {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  },

  getCurrentAdmin() {
    const data = localStorage.getItem(ADMIN_DATA_KEY) || sessionStorage.getItem(ADMIN_DATA_KEY);
    return data ? JSON.parse(data) : null;
  },

  setCurrentAdmin(admin, remember = false) {
    const str = JSON.stringify(admin);
    if (remember) {
      localStorage.setItem(ADMIN_DATA_KEY, str);
    } else {
      sessionStorage.setItem(ADMIN_DATA_KEY, str);
    }
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_DATA_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_DATA_KEY);
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      const json = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized Session Expiration
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          this.clearSession();
          if (typeof Auth !== 'undefined' && Auth.showLogin) {
            Auth.showLogin();
          }
          throw new Error('Your administrative session has expired. Please sign in again.');
        }

        const errorMessage = json.error?.message || json.message || 'API request failed';
        const error = new Error(errorMessage);
        error.code = json.error?.code || 'API_ERROR';
        error.status = response.status;
        error.details = json.error?.details;
        throw error;
      }

      return json;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Cannot connect to SEERAT backend server. Ensure the backend is reachable at https://seerat-backend.onrender.com.');
      }
      throw err;
    }
  },

  // HTTP Helper Methods
  get(endpoint, params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });

    const queryString = queryParams.toString();
    const finalEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(finalEndpoint, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async upload(endpoint, formData) {
    const token = this.getToken();
    const headers = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    const json = await response.json();
    if (!response.ok) {
      const errorMessage = json.error?.message || json.message || 'File upload failed';
      throw new Error(errorMessage);
    }
    return json;
  }
};
