import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate } from '../utils/dateFormatter';
import { 
  ShieldCheck, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  UserCheck, 
  FileText, 
  TrendingUp, 
  Send, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const CHART_COLORS = ['#1e3a8a', '#2563eb', '#b45309', '#0284c7', '#475569', '#d97706'];

const StationAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [pendingCases, setPendingCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [officers, setOfficers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Case Assignment state
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Review Modal state
  const [reviewCase, setReviewCase] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchShoData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, pendingRes, casesRes, officersRes] = await Promise.all([
        api.get('/cases/sho/analytics'),
        api.get('/cases/sho/pending-reviews'),
        api.get('/cases/'),
        api.get('/cases/sho/officers')
      ]);

      setAnalytics(analyticsRes.data);
      setPendingCases(pendingRes.data || []);
      setAllCases(casesRes.data || []);
      setOfficers(officersRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to load SHO command data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'SHO') {
      fetchShoData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!selectedCaseId || !selectedOfficer) {
      alert('Please select both a case and an officer for assignment.');
      return;
    }

    setAssigning(true);
    try {
      await api.post(`/cases/${selectedCaseId}/assign`, {
        investigating_officer: selectedOfficer
      });
      alert(`Case successfully assigned to Officer ${selectedOfficer}.`);
      setSelectedCaseId('');
      setSelectedOfficer('');
      fetchShoData();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to assign officer.');
    } finally {
      setAssigning(false);
    }
  };

  const handleQuickReview = async (actionType) => {
    if (!reviewCase) return;
    setReviewing(true);
    try {
      await api.post(`/cases/${reviewCase.id}/sho-review`, {
        action: actionType,
        remarks: reviewRemarks
      });
      alert(`Supervisory review '${actionType === 'approve' ? 'Approved & Closed' : 'Revision Requested'}' processed successfully.`);
      setReviewCase(null);
      setReviewRemarks('');
      fetchShoData();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Review submission failed.');
    } finally {
      setReviewing(false);
    }
  };

  if (user && user.role !== 'SHO') {
    return (
      <div className="p-8 max-w-md mx-auto mt-20 bg-white border border-[#e2e8f0] rounded-lg shadow-sm text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-650 mx-auto" />
        <h2 className="text-sm font-black text-[#1e293b] uppercase tracking-widest">Station Clearance Required</h2>
        <p className="text-[#64748b] text-xs leading-relaxed">
          The Station Supervisory Command Portal is restricted strictly to Station House Officers (SHO).
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto bg-[#f8fafc] min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <h1 className="text-xl font-black text-[#1e293b] tracking-wide uppercase flex items-center gap-2.5">
            <ShieldCheck className="text-[#1e3a8a] w-6 h-6" />
            <span>Station Supervisory Command Center</span>
          </h1>
          <p className="text-xs text-[#64748b] mt-1">
            SHO Operational oversight, pending review approvals, case assignments, and station analytics.
          </p>
        </div>
        <button
          onClick={fetchShoData}
          disabled={loading}
          className="bg-[#ffffff] hover:bg-[#eff6ff] border border-[#e2e8f0] text-[#1e293b] px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wide shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#1e3a8a] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 text-xs font-bold">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Station Key Metrics */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-2 text-[#64748b] text-xs font-bold">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1e3a8a]" />
            <span>Loading station operational data...</span>
          </div>
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-[#64748b] font-extrabold uppercase tracking-wider">Total Station Cases</span>
            <span className="text-2xl font-black text-[#1e293b] mt-2">{analytics.total_cases}</span>
          </div>

          <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-[#64748b] font-extrabold uppercase tracking-wider">Active Investigations</span>
            <span className="text-2xl font-black text-[#1e3a8a] mt-2">{analytics.active_cases}</span>
          </div>

          <div className="bg-[#ffffff] border border-amber-200 bg-amber-50/40 p-5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider">Pending SHO Reviews</span>
            <span className="text-2xl font-black text-amber-800 mt-2">{analytics.pending_reviews}</span>
          </div>

          <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-[#64748b] font-extrabold uppercase tracking-wider">Revision Requested</span>
            <span className="text-2xl font-black text-[#b45309] mt-2">{analytics.revision_requested}</span>
          </div>

          <div className="bg-[#ffffff] border border-emerald-200 bg-emerald-50/40 p-5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Closed Cases</span>
            <span className="text-2xl font-black text-emerald-800 mt-2">{analytics.closed_cases}</span>
          </div>
        </div>
      ) : null}

      {/* 2. Pending SHO Reviews Queue */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-3">
          <h2 className="text-xs font-black text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Pending SHO Reviews Queue ({pendingCases.length})</span>
          </h2>
          <span className="text-[10px] font-bold text-[#64748b] uppercase">Investigations awaiting supervisory approval</span>
        </div>

        {pendingCases.length === 0 ? (
          <div className="py-10 text-center text-[#64748b] text-xs font-bold border border-dashed border-[#e2e8f0] rounded-lg bg-[#f8fafc]">
            No investigations are currently waiting for SHO review.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingCases.map((c) => (
              <div key={c.id} className="bg-[#ffffff] border border-amber-200 rounded-lg p-4 space-y-3 shadow-sm hover:border-[#1e3a8a] transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-black text-[#1e293b] uppercase">FIR No. {c.fir_number}</h3>
                    <span className="text-[10px] text-[#64748b] font-bold block mt-0.5">{c.crime_type} • {c.police_station}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                    Pending Review
                  </span>
                </div>

                <div className="text-[10px] text-[#64748b] font-bold space-y-1 bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]">
                  <div className="flex justify-between">
                    <span>Officer:</span>
                    <span className="text-[#1e293b] font-black">{c.case_details?.investigating_officer || c.details?.investigating_officer || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Incident Date:</span>
                    <span className="text-[#1e293b]">{formatDate(c.incident_date)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReviewCase(c)}
                    className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-1.5 rounded text-[10px] uppercase tracking-wider transition-all"
                  >
                    Supervisory Review
                  </button>
                  <Link
                    to={`/cases/${c.id}`}
                    className="bg-[#ffffff] border border-[#e2e8f0] hover:bg-[#eff6ff] text-[#1e293b] px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3 text-[#1e3a8a]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Case Assignment & Reassignment Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-lg shadow-sm p-6 space-y-4 lg:col-span-1">
          <h2 className="text-xs font-black text-[#1e293b] uppercase tracking-widest border-b border-[#e2e8f0] pb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#1e3a8a]" />
            <span>Case Officer Assignment Hub</span>
          </h2>

          <form onSubmit={handleAssignOfficer} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-extrabold text-[#1e293b] uppercase tracking-wider block mb-1">Select Case File</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] p-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb]"
              >
                <option value="">-- Choose Case Dossier --</option>
                {allCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    FIR: {c.fir_number} ({c.crime_type}) - Current: {c.case_details?.investigating_officer || c.details?.investigating_officer || 'Unassigned'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#1e293b] uppercase tracking-wider block mb-1">Assign Police Officer</label>
              <select
                value={selectedOfficer}
                onChange={(e) => setSelectedOfficer(e.target.value)}
                className="w-full bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] p-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb]"
              >
                <option value="">-- Select Officer --</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name} ({o.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={assigning || !selectedCaseId || !selectedOfficer}
              className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
            >
              {assigning ? 'Assigning Officer...' : 'Confirm Case Assignment'}
            </button>
          </form>
        </div>

        {/* 4. Station Analytics & Officer Workload Charts */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-lg shadow-sm p-6 space-y-4 lg:col-span-2">
          <h2 className="text-xs font-black text-[#1e293b] uppercase tracking-widest border-b border-[#e2e8f0] pb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1e3a8a]" />
            <span>Officer Workload & Crime Analytics</span>
          </h2>

          {analytics?.workload && analytics.workload.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.workload} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="officer_name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    formatter={(val) => [`${val} Cases`, 'Assigned Dossiers']}
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="case_count" fill="#1e3a8a" radius={[4, 4, 0, 0]} name="Assigned Cases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center text-[#64748b] text-xs font-bold border border-dashed border-[#e2e8f0] rounded-lg">
              No workload data recorded for active officers.
            </div>
          )}
        </div>
      </div>

      {/* Review Action Modal */}
      {reviewCase && (
        <div className="fixed inset-0 bg-[#1e293b]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e2e8f0] w-full max-w-lg rounded-lg shadow-xl overflow-hidden">
            <div className="bg-[#1e3a8a] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest">
                Supervisory Review — FIR No. {reviewCase.fir_number}
              </h3>
              <button onClick={() => setReviewCase(null)} className="text-white/80 hover:text-white text-sm font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded space-y-1">
                <span className="font-bold text-[#1e293b]">Crime Category: {reviewCase.crime_type}</span>
                <p className="text-[11px] text-[#64748b]">Assigned Officer: {reviewCase.case_details?.investigating_officer || reviewCase.details?.investigating_officer || 'Unassigned'}</p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#1e293b] uppercase tracking-wider block mb-1">
                  SHO Supervisory Remarks / Directives
                </label>
                <textarea
                  rows={3}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Enter supervisory instructions, evidence requirements, or approval rationale..."
                  className="w-full bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] p-3 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleQuickReview('request_revision')}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all"
                >
                  Request Revisions
                </button>

                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleQuickReview('approve')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-wider shadow-sm transition-all"
                >
                  Approve & Close Case
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationAnalytics;
