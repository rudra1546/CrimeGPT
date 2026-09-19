import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Shield,
  MapPin,
  User
} from 'lucide-react';

/**
 * Maps backend urgency string to styling tokens.
 */
const getUrgencyMeta = (urgency) => {
  const u = String(urgency || '').toLowerCase();
  if (u === 'critical') {
    return {
      label: 'Critical Investigation Delay',
      badge: 'bg-red-50 text-red-700 border-red-200',
      border: 'border-l-4 border-l-red-600',
      dot: 'bg-red-600',
    };
  }
  if (u === 'high') {
    return {
      label: 'High Urgency Review',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
      border: 'border-l-4 border-l-orange-500',
      dot: 'bg-orange-500',
    };
  }
  return {
    label: 'Pending Case Follow-up',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-l-4 border-l-amber-500',
    dot: 'bg-amber-500',
  };
};

/**
 * Human-readable status formatter.
 */
const formatStatus = (status) => {
  if (!status) return 'Active';
  return status.replace(/_/g, ' ');
};

const PendingCasePopup = () => {
  const navigate = useNavigate();
  const { undismissedPendingCases, dismissCase } = useNotifications();
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = undismissedPendingCases.length;

  // Keep index in bounds if cases change or get dismissed
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(total - 1);
    }
  }, [total, currentIndex]);

  if (total === 0) {
    return null;
  }

  const activeCase = undismissedPendingCases[currentIndex] || undismissedPendingCases[0];
  if (!activeCase) return null;

  const urgency = getUrgencyMeta(activeCase.urgency);

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleDismiss = () => {
    // Pure client-side dismissal for today, never mutates case status
    dismissCase(activeCase.case_id);
  };

  const handleViewCase = () => {
    navigate(`/cases/${activeCase.case_id}`);
  };

  return (
    <aside
      role="alert"
      aria-live="polite"
      aria-label={`Overdue Pending Case Reminder: FIR ${activeCase.fir_number}`}
      className={`fixed bottom-5 right-5 z-50 w-80 sm:w-96 max-w-[calc(100vw-2.5rem)] bg-[#ffffff] border border-[#e2e8f0] ${urgency.border} rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      {/* Top Header Bar */}
      <div className="p-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#eff6ff] border border-[#bfdbfe] rounded-md text-[#1e3a8a]">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1e293b]">
            Pending Case Alert
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Multiple Cases Counter & Carousel Controls */}
          {total > 1 && (
            <div className="flex items-center gap-1 bg-[#ffffff] border border-[#e2e8f0] px-1.5 py-0.5 rounded text-[9px] font-bold text-[#64748b]">
              <span>
                {currentIndex + 1} of {total}
              </span>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous pending case"
                className="hover:text-[#1e293b] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === total - 1}
                aria-label="Next pending case"
                className="hover:text-[#1e293b] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Close / Dismiss for Today Button */}
          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss this case reminder for today"
            aria-label="Dismiss case reminder for today"
            className="p-1 text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] rounded-md transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-black text-[#1e293b] tracking-wide block">
              FIR #{activeCase.fir_number}
            </span>
            <span className="text-[11px] text-[#64748b] font-medium capitalize">
              {activeCase.crime_type || 'Active Case Investigation'}
            </span>
          </div>

          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${urgency.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
            {activeCase.urgency}
          </span>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#64748b] bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0]/70">
          <div className="space-y-0.5 truncate">
            <span className="text-[8px] font-bold uppercase text-[#64748b]/80 block">Duration</span>
            <div className="flex items-center gap-1 font-bold text-[#1e293b] truncate">
              <Clock className="w-3 h-3 text-[#1e3a8a] flex-shrink-0" />
              <span className="truncate">{activeCase.duration_formatted || `${activeCase.days_pending} days`}</span>
            </div>
          </div>

          <div className="space-y-0.5 truncate">
            <span className="text-[8px] font-bold uppercase text-[#64748b]/80 block">Status</span>
            <div className="flex items-center gap-1 font-semibold text-[#1e293b] truncate uppercase">
              <Shield className="w-3 h-3 text-[#2563eb] flex-shrink-0" />
              <span className="truncate">{formatStatus(activeCase.status)}</span>
            </div>
          </div>

          <div className="space-y-0.5 truncate">
            <span className="text-[8px] font-bold uppercase text-[#64748b]/80 block">Police Station</span>
            <div className="flex items-center gap-1 text-[#1e293b] truncate">
              <MapPin className="w-3 h-3 text-[#64748b] flex-shrink-0" />
              <span className="truncate" title={activeCase.police_station}>
                {activeCase.police_station || 'Station N/A'}
              </span>
            </div>
          </div>

          <div className="space-y-0.5 truncate">
            <span className="text-[8px] font-bold uppercase text-[#64748b]/80 block">Investigating Officer</span>
            <div className="flex items-center gap-1 text-[#1e293b] truncate">
              <User className="w-3 h-3 text-[#64748b] flex-shrink-0" />
              <span className="truncate" title={activeCase.investigating_officer || 'Unassigned'}>
                {activeCase.investigating_officer || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] font-bold text-[#64748b] hover:text-[#1e293b] px-2 py-1.5 rounded-lg hover:bg-[#f1f5f9] transition-all"
          >
            Dismiss today
          </button>

          <button
            type="button"
            onClick={handleViewCase}
            className="flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-sm"
          >
            <span>View Case</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PendingCasePopup;
