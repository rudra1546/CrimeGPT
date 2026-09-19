/**
 * Minimal browser storage utility for CrimeGPT once-per-day-per-case popup dismissal.
 * 
 * Rules:
 * - Minimal data: only maps case ID string to the dismissal date string (YYYY-MM-DD).
 * - Never stores tokens, auth headers, or sensitive case details.
 * - Automatically prunes expired dates older than today to prevent unbounded growth.
 * - Falls back cleanly to in-memory/session Set if localStorage is disabled, throws, or is unavailable (e.g. private mode).
 * - Does NOT make any network calls or alter backend case status.
 */

const STORAGE_KEY = 'crimegpt_dismissed_cases';

// In-memory fallback if localStorage is blocked or unavailable
const sessionDismissedCases = new Set();

/**
 * Returns today's local date string formatted as YYYY-MM-DD.
 */
const getTodayDateString = () => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

/**
 * Checks whether a specific case ID was dismissed today.
 * @param {number|string} caseId 
 * @returns {boolean}
 */
export const isCaseDismissedToday = (caseId) => {
  if (caseId == null) return false;
  const idStr = String(caseId);
  const today = getTodayDateString();

  // 1. Check in-memory session first (covers session fallback and immediate dismissal)
  if (sessionDismissedCases.has(idStr)) {
    return true;
  }

  // 2. Check localStorage
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed[idStr] === today) {
      return true;
    }
  } catch (e) {
    // If localStorage access fails (e.g. SecurityError), fallback to session
    return sessionDismissedCases.has(idStr);
  }

  return false;
};

/**
 * Records a specific case ID as dismissed for today.
 * @param {number|string} caseId 
 */
export const dismissCaseToday = (caseId) => {
  if (caseId == null) return;
  const idStr = String(caseId);
  const today = getTodayDateString();

  // Always mark in session Set for immediate in-session consistency
  sessionDismissedCases.add(idStr);

  try {
    let records = {};
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        records = parsed;
      }
    }

    // Keep storage minimal: prune records older than today
    const pruned = {};
    for (const [key, dateVal] of Object.entries(records)) {
      if (dateVal === today) {
        pruned[key] = dateVal;
      }
    }
    pruned[idStr] = today;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch (e) {
    // localStorage unavailable, session fallback is already active
  }
};

/**
 * Returns a list of cases filtered to only those not dismissed today.
 * @param {Array} cases 
 * @returns {Array}
 */
export const filterUndismissedCases = (cases = []) => {
  if (!Array.isArray(cases)) return [];
  return cases.filter((c) => {
    const id = c.case_id ?? c.id;
    return !isCaseDismissedToday(id);
  });
};
