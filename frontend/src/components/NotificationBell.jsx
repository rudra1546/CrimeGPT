import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { formatDateTime } from '../utils/dateFormatter';
import {
  Bell,
  Clock,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  X,
  ExternalLink,
  Shield,
  FileText,
  User,
  MapPin
} from 'lucide-react';

/**
 * Maps category strings to clean badge styles.
 */
const getCategoryBadge = (category) => {
  const cat = String(category || '').toUpperCase();
  if (cat.includes('EVIDENCE')) {
    return { label: 'Evidence', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  if (cat.includes('DOCUMENT')) {
    return { label: 'Document', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (cat.includes('STATUS') || cat.includes('REVIEW')) {
    return { label: 'Review', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (cat.includes('CASE')) {
    return { label: 'Case', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  return { label: cat || 'Activity', color: 'bg-slate-50 text-slate-700 border-slate-200' };
};

/**
 * Maps urgency to badge colors.
 */
const getUrgencyBadge = (urgency) => {
  const u = String(urgency || '').toLowerCase();
  if (u === 'critical') {
    return { label: 'Critical', bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600' };
  }
  if (u === 'high') {
    return { label: 'High Urgency', bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-600' };
  }
  return { label: 'Moderate', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
};

/**
 * Format status text for display.
 */
const formatStatus = (status) => {
  if (!status) return 'Active';
  return status.replace(/_/g, ' ');
};

const NotificationBell = ({ compact = false }) => {
  const navigate = useNavigate();
  const {
    summary,
    loadingSummary,
    summaryError,
    fullRecentActivity,
    loadingRecentActivity,
    recentActivityError,
    fullPendingCases,
    loadingPendingCases,
    pendingCasesError,
    fetchFullRecentActivity,
    fetchFullPendingCases,
    refreshAll,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'activity'
  const [isRefreshing, setIsRefreshing] = useState(false);

  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  // Close panel on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleRefresh = async (e) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewCase = (caseId) => {
    setIsOpen(false);
    navigate(`/cases/${caseId}`);
  };

  // Activity list items (full list if loaded, else summary preview)
  const activityItems = fullRecentActivity?.items ?? summary?.recent_activity ?? [];
  const activityTotal = fullRecentActivity?.total ?? summary?.recent_activity_count ?? 0;
  const hasMoreActivity = activityTotal > activityItems.length && !fullRecentActivity;

  // Pending cases list items (full list if loaded, else summary preview)
  const pendingItems = fullPendingCases?.items ?? summary?.pending_cases ?? [];
  const pendingTotal = fullPendingCases?.total_eligible ?? summary?.pending_cases_count ?? 0;
  const hasMorePending = pendingTotal > pendingItems.length && !fullPendingCases;

  const hasUrgent = summary?.has_urgent_reminders ?? false;
  const totalCountBadge = pendingTotal > 0 ? pendingTotal : (summary?.recent_activity_count ?? 0);

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Bell Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label={`CrimeGPT Notifications (${pendingTotal} pending cases, ${summary?.recent_activity_count ?? 0} activities)`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 ${compact
          ? 'p-1 text-[#64748b] hover:text-[#1e293b] hover:bg-[#eff6ff]'
          : 'px-3 py-2 bg-[#ffffff] border border-[#e2e8f0] text-[#1e293b] hover:bg-[#f8fafc] hover:border-[#bfdbfe] shadow-sm text-xs font-bold'
          } ${isOpen ? 'bg-[#eff6ff] text-[#1e3a8a] border-[#bfdbfe]' : ''}`}
      >
        <div className="relative flex items-center gap-1.5">
          <Bell className={`${compact ? 'w-4 h-4' : 'w-4 h-4'} text-[#1e3a8a]`} />
          {!compact && (
            <span className="hidden sm:inline text-xs font-bold text-[#1e293b]">Alerts</span>
          )}

          {/* Urgent Ping Dot Indicator */}
          {hasUrgent && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
            </span>
          )}

          {/* Badge Count */}
          {pendingTotal > 0 && !hasUrgent && (
            <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-[#b45309] text-white text-[9px] font-black rounded-full min-w-[16px] text-center shadow-xs">
              {pendingTotal > 99 ? '99+' : pendingTotal}
            </span>
          )}
        </div>
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notification Center"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#ffffff] border border-[#e2e8f0] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Panel Header */}
          <div className="p-3.5 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg text-[#1e3a8a]">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1e293b]">
                  Notification Center
                </h3>
                <span className="text-[10px] text-[#64748b] font-medium block">
                  Active CrimeGPT Reminders & Logs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh notifications"
                aria-label="Refresh notifications"
                disabled={isRefreshing || loadingSummary}
                className="p-1.5 text-[#64748b] hover:text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1e3a8a]' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notification panel"
                className="p-1.5 text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] rounded-lg transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#e2e8f0] bg-[#ffffff] p-1 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${activeTab === 'pending'
                ? 'bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe] font-black'
                : 'text-[#64748b] hover:text-[#1e293b] hover:bg-[#f8fafc]'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Cases</span>
              {pendingTotal > 0 && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${hasUrgent
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-[#bfdbfe] text-[#1e3a8a]'
                    }`}
                >
                  {pendingTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${activeTab === 'activity'
                ? 'bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe] font-black'
                : 'text-[#64748b] hover:text-[#1e293b] hover:bg-[#f8fafc]'
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Recent Activity</span>
              {activityTotal > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-black">
                  {activityTotal}
                </span>
              )}
            </button>
          </div>

          {/* Panel Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#e2e8f0]">
            {/* Global Summary Error */}
            {summaryError && (
              <div className="p-4 bg-red-50 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Error loading summary</p>
                  <p className="text-[11px] text-red-600 mt-0.5">{summaryError}</p>
                  <button
                    type="button"
                    onClick={() => refreshAll()}
                    className="mt-2 text-[10px] font-bold text-red-800 underline hover:no-underline"
                  >
                    Retry connection
                  </button>
                </div>
              </div>
            )}

            {/* Loading Initial Summary Skeleton */}
            {loadingSummary && !summary && (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-2.5 bg-slate-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 1: PENDING CASES (OVERDUE REMINDERS) */}
            {activeTab === 'pending' && !loadingSummary && (
              <>
                {pendingCasesError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs flex items-center justify-between">
                    <span>{pendingCasesError}</span>
                    <button
                      type="button"
                      onClick={() => fetchFullPendingCases(true)}
                      className="text-[10px] font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {pendingItems.length === 0 ? (
                  <div className="p-8 text-center text-[#64748b] space-y-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-[#1e293b]">No overdue pending cases</p>
                    <p className="text-[10px] text-[#64748b]">
                      All active cases are within normal investigation timelines (&lt; 30 days).
                    </p>
                  </div>
                ) : (
                  pendingItems.map((item) => {
                    const urgencyMeta = getUrgencyBadge(item.urgency);
                    return (
                      <div
                        key={item.case_id}
                        className="p-3.5 hover:bg-[#f8fafc] transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-black text-[#1e293b] tracking-wide block">
                              FIR: {item.fir_number}
                            </span>
                            <span className="text-[10px] text-[#64748b] capitalize font-medium">
                              {item.crime_type || 'Case Investigation'}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${urgencyMeta.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${urgencyMeta.dot}`} />
                            {urgencyMeta.label}
                          </span>
                        </div>

                        {/* Metadata Rows: Status, Duration, Station, Officer */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#64748b] bg-[#f8fafc] p-2 rounded-lg border border-[#e2e8f0]/60">
                          <div className="flex items-center gap-1 truncate">
                            <Clock className="w-3 h-3 text-[#1e3a8a] flex-shrink-0" />
                            <span className="font-bold text-[#1e293b] truncate">
                              {item.duration_formatted || `${item.days_pending} days`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <Shield className="w-3 h-3 text-[#2563eb] flex-shrink-0" />
                            <span className="truncate font-semibold uppercase">
                              {formatStatus(item.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-[#64748b] flex-shrink-0" />
                            <span className="truncate" title={item.police_station}>
                              {item.police_station || 'Station N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-[#64748b] flex-shrink-0" />
                            <span className="truncate" title={item.investigating_officer || 'Unassigned'}>
                              {item.investigating_officer || 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        {/* View Case Action */}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleViewCase(item.case_id)}
                            className="text-[10px] font-bold text-[#1e3a8a] hover:text-[#2563eb] flex items-center gap-1 hover:underline"
                          >
                            <span>View Case Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Load Full Pending List on Demand */}
                {hasMorePending && (
                  <div className="p-2.5 bg-[#f8fafc] text-center border-t border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={() => fetchFullPendingCases()}
                      disabled={loadingPendingCases}
                      className="text-[11px] font-bold text-[#1e3a8a] hover:underline flex items-center justify-center gap-1 w-full py-1 disabled:opacity-50"
                    >
                      {loadingPendingCases ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Loading full pending list...</span>
                        </>
                      ) : (
                        <span>View all {pendingTotal} overdue cases</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: RECENT CRIMEGPT ACTIVITY */}
            {activeTab === 'activity' && !loadingSummary && (
              <>
                {recentActivityError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs flex items-center justify-between">
                    <span>{recentActivityError}</span>
                    <button
                      type="button"
                      onClick={() => fetchFullRecentActivity(true)}
                      className="text-[10px] font-bold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {activityItems.length === 0 ? (
                  <div className="p-8 text-center text-[#64748b] space-y-1">
                    <p className="text-xs font-bold text-[#1e293b]">No recent activity</p>
                    <p className="text-[10px] text-[#64748b]">System and user events will show here.</p>
                  </div>
                ) : (
                  activityItems.map((act) => {
                    const catBadge = getCategoryBadge(act.category);
                    return (
                      <div
                        key={act.id}
                        className="p-3.5 hover:bg-[#f8fafc] transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${catBadge.color}`}
                          >
                            {catBadge.label}
                          </span>
                          <span className="text-[9px] text-[#64748b] font-medium">
                            {formatDateTime(act.timestamp)}
                          </span>
                        </div>

                        <p className="text-xs text-[#1e293b] font-medium leading-snug">
                          {act.formatted_message}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-0.5">
                          <span className="truncate">
                            By: <strong className="text-[#1e293b] font-bold">{act.actor}</strong>
                          </span>
                          {act.case_id && (
                            <button
                              type="button"
                              onClick={() => handleViewCase(act.case_id)}
                              className="text-[#1e3a8a] hover:text-[#2563eb] font-bold flex items-center gap-0.5 hover:underline"
                            >
                              <span>Case #{act.fir_number || act.case_id}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Load Full Activity on Demand */}
                {hasMoreActivity && (
                  <div className="p-2.5 bg-[#f8fafc] text-center border-t border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={() => fetchFullRecentActivity()}
                      disabled={loadingRecentActivity}
                      className="text-[11px] font-bold text-[#1e3a8a] hover:underline flex items-center justify-center gap-1 w-full py-1 disabled:opacity-50"
                    >
                      {loadingRecentActivity ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Loading full activity feed...</span>
                        </>
                      ) : (
                        <span>View all {activityTotal} activity records</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-2.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-[10px] text-[#64748b] font-medium">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#1e3a8a]" />
              <span>National Police Registry Security</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#1e3a8a] font-bold hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
