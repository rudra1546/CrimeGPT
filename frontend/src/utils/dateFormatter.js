/**
 * Reusable Date & Time Formatting Utilities for CrimeGPT.
 * Standardizes parsing of UTC ISO timestamps (including backward compatibility for SQLite naive datetime strings)
 * and formats them into the user's browser local timezone (e.g. Asia/Kolkata / IST for India).
 */

/**
 * Safely parses any timestamp string/number/Date into a valid UTC-aware Date object.
 * Handles legacy SQLite naive datetime strings (e.g. "2026-08-01 09:27:26") by appending "Z"
 * to ensure JavaScript parses them as UTC rather than local time.
 */
export const parseUTCDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return isNaN(timestamp.getTime()) ? null : timestamp;

  let str = String(timestamp).trim();
  if (!str) return null;

  // Check if naive ISO / SQL string without timezone indicator (e.g. "2026-08-01 09:27:26" or "2026-08-01T09:27:26")
  if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }

  const parsedDate = new Date(str);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/**
 * Formats a timestamp into local Date and Time string (e.g. "8/1/2026, 2:57:21 PM").
 */
export const formatDateTime = (timestamp, options = {}) => {
  const dateObj = parseUTCDate(timestamp);
  if (!dateObj) return typeof timestamp === 'string' ? timestamp : 'N/A';

  const defaultOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options
  };

  return dateObj.toLocaleString(undefined, defaultOptions);
};

/**
 * Formats a timestamp into local Date string (e.g. "8/1/2026").
 */
export const formatDate = (timestamp, options = {}) => {
  const dateObj = parseUTCDate(timestamp);
  if (!dateObj) return typeof timestamp === 'string' ? timestamp : 'N/A';

  const defaultOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    ...options
  };

  return dateObj.toLocaleDateString(undefined, defaultOptions);
};

/**
 * Formats a timestamp into local Time string (e.g. "2:57:21 PM").
 */
export const formatTime = (timestamp, options = {}) => {
  const dateObj = parseUTCDate(timestamp);
  if (!dateObj) return typeof timestamp === 'string' ? timestamp : 'N/A';

  const defaultOptions = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options
  };

  return dateObj.toLocaleTimeString(undefined, defaultOptions);
};
