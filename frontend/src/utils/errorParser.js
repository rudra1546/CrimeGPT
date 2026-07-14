/**
 * parseApiError — Reusable error parser for Axios / FastAPI responses.
 *
 * Handles:
 *  - FastAPI 422 validation errors (array of {type, loc, msg, input} objects)
 *  - Standard string `detail` messages (e.g. "Invalid credentials")
 *  - HTTP 401 Unauthorized
 *  - HTTP 403 Forbidden
 *  - Network / timeout errors (no response object)
 *
 * Always returns a plain string so React can safely render it.
 */
export function parseApiError(error) {
  // ── No response at all (network failure, CORS, timeout) ──
  if (!error.response) {
    if (error.code === 'ERR_NETWORK') {
      return 'Network error — unable to reach the server. Please check your connection.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    return error.message || 'An unexpected network error occurred.';
  }

  const { status, data } = error.response;

  // ── 401 Unauthorized ──
  if (status === 401) {
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    return 'Session expired or invalid credentials. Please log in again.';
  }

  // ── 403 Forbidden ──
  if (status === 403) {
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    return 'Access denied. You do not have permission to perform this action.';
  }

  // ── 422 Validation Error (FastAPI) ──
  // FastAPI returns { detail: [ {type, loc, msg, input, ...}, ... ] }
  if (status === 422 && Array.isArray(data?.detail)) {
    const messages = data.detail.map((err) => {
      // loc is an array like ["body", "email"] — drop the first "body" element
      const field = (err.loc || []).filter((l) => l !== 'body').join('.');
      const msg = err.msg || 'Validation error';
      return field ? `${field}: ${msg}` : msg;
    });
    return messages.join(' | ');
  }

  // ── Standard string detail ──
  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  // ── Fallback: try to stringify whatever detail is ──
  if (data?.detail) {
    try {
      return JSON.stringify(data.detail);
    } catch {
      // ignore
    }
  }

  // ── Generic message based on status code ──
  if (status === 404) return 'The requested resource was not found.';
  if (status === 500) return 'Internal server error. Please try again later.';
  if (status >= 400) return `Request failed with status ${status}.`;

  return 'An unexpected error occurred.';
}
