import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import api from '../services/api';
import { isCaseDismissedToday, dismissCaseToday, filterUndismissedCases } from '../utils/notificationStorage';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const [fullRecentActivity, setFullRecentActivity] = useState(null);
  const [loadingRecentActivity, setLoadingRecentActivity] = useState(false);
  const [recentActivityError, setRecentActivityError] = useState(null);

  const [fullPendingCases, setFullPendingCases] = useState(null);
  const [loadingPendingCases, setLoadingPendingCases] = useState(false);
  const [pendingCasesError, setPendingCasesError] = useState(null);

  // Version counter to trigger re-computation of undismissed cases when user dismisses a case
  const [dismissalTick, setDismissalTick] = useState(0);

  const isFetchingSummaryRef = useRef(false);
  const isFetchingRecentRef = useRef(false);
  const isFetchingPendingRef = useRef(false);
  const hasFetchedSummaryRef = useRef(false);

  /**
   * Fetches notification summary from GET /api/notifications/summary.
   * Prevents duplicate in-flight requests and avoids unnecessary refetches unless force=true.
   */
  const fetchSummary = useCallback(async (force = false) => {
    if (isFetchingSummaryRef.current) return;
    if (hasFetchedSummaryRef.current && !force) return;

    isFetchingSummaryRef.current = true;
    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const response = await api.get('/notifications/summary');
      setSummary(response.data);
      hasFetchedSummaryRef.current = true;
    } catch (err) {
      console.error('Failed to fetch notification summary:', err);
      setSummaryError(err._parsedMessage || 'Could not load notifications');
    } finally {
      setLoadingSummary(false);
      isFetchingSummaryRef.current = false;
    }
  }, []);

  /**
   * Fetches full recent activity list on demand from GET /api/notifications/recent-activity.
   */
  const fetchFullRecentActivity = useCallback(async (force = false) => {
    if (isFetchingRecentRef.current) return;
    if (fullRecentActivity && !force) return;

    isFetchingRecentRef.current = true;
    setLoadingRecentActivity(true);
    setRecentActivityError(null);

    try {
      const response = await api.get('/notifications/recent-activity', {
        params: { limit: 50, offset: 0 }
      });
      setFullRecentActivity(response.data);
    } catch (err) {
      console.error('Failed to fetch recent activity list:', err);
      setRecentActivityError(err._parsedMessage || 'Failed to load activity logs');
    } finally {
      setLoadingRecentActivity(false);
      isFetchingRecentRef.current = false;
    }
  }, [fullRecentActivity]);

  /**
   * Fetches full pending cases list on demand from GET /api/notifications/pending-cases.
   */
  const fetchFullPendingCases = useCallback(async (force = false) => {
    if (isFetchingPendingRef.current) return;
    if (fullPendingCases && !force) return;

    isFetchingPendingRef.current = true;
    setLoadingPendingCases(true);
    setPendingCasesError(null);

    try {
      const response = await api.get('/notifications/pending-cases', {
        params: { min_days: 30, limit: 50, offset: 0 }
      });
      setFullPendingCases(response.data);
    } catch (err) {
      console.error('Failed to fetch pending cases list:', err);
      setPendingCasesError(err._parsedMessage || 'Failed to load pending cases');
    } finally {
      setLoadingPendingCases(false);
      isFetchingPendingRef.current = false;
    }
  }, [fullPendingCases]);

  /**
   * Refreshes summary and clears cached full lists.
   */
  const refreshAll = useCallback(async () => {
    setFullRecentActivity(null);
    setFullPendingCases(null);
    await fetchSummary(true);
  }, [fetchSummary]);

  /**
   * Dismisses a case reminder for today (pure client-side).
   * Does NOT alter case status in backend.
   */
  const dismissCase = useCallback((caseId) => {
    if (caseId == null) return;
    dismissCaseToday(caseId);
    setDismissalTick((prev) => prev + 1);
  }, []);

  /**
   * List of eligible pending cases that have NOT been dismissed today.
   */
  const undismissedPendingCases = useMemo(() => {
    // Rely on dismissalTick to recalculate
    void dismissalTick;
    const cases = summary?.pending_cases || [];
    return filterUndismissedCases(cases);
  }, [summary?.pending_cases, dismissalTick]);

  const value = {
    summary,
    loadingSummary,
    summaryError,
    fullRecentActivity,
    loadingRecentActivity,
    recentActivityError,
    fullPendingCases,
    loadingPendingCases,
    pendingCasesError,
    fetchSummary,
    fetchFullRecentActivity,
    fetchFullPendingCases,
    refreshAll,
    dismissCase,
    isCaseDismissedToday,
    undismissedPendingCases,
    pendingEligibleCount: undismissedPendingCases.length,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
