import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate } from '../utils/dateFormatter';
import { 
  Search, 
  Filter, 
  Trash2, 
  FolderOpen, 
  AlertTriangle,
  Plus
} from 'lucide-react';

const Cases = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('search') || '';

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await api.get('/cases/');
      setCases(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch case data from directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (queryParam) {
      setSearch(queryParam);
    }
  }, [queryParam]);

  const handleDelete = async (id, firNumber) => {
    if (!window.confirm(`CONFIRMATION REQUIRED:\nAre you sure you want to permanently delete Case ${firNumber}?\nThis action cannot be undone and will delete all associated document drafts.`)) {
      return;
    }
    try {
      await api.delete(`/cases/${id}`);
      fetchCases();
    } catch (err) {
      console.error(err);
      alert('Delete operation failed. Please check administrative clearance.');
    }
  };

  const formatStatusBadge = (statusStr) => {
    switch (statusStr?.toLowerCase()) {
      case 'pending_sho_review':
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-50 text-amber-700 border border-amber-200">Pending SHO Review</span>;
      case 'revision_requested':
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-orange-50 text-orange-700 border border-orange-200">Revision Requested</span>;
      case 'closed':
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-200">Closed</span>;
      case 'active':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>;
    }
  };

  // Filter and Search logic
  const filteredCases = cases.filter((c) => {
    const matchesSearch = 
      c.fir_number.toLowerCase().includes(search.toLowerCase()) ||
      c.crime_type.toLowerCase().includes(search.toLowerCase()) ||
      c.police_station.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'All' || 
      c.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto bg-[#f8fafc] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-6 gap-4">
        <div>
          <h1 className="text-xl font-black tracking-wide text-[#1e293b] uppercase">National Case Registry</h1>
          <p className="text-xs text-[#64748b] mt-1">Index of registered FIRs, ongoing investigations, and legal records.</p>
        </div>
        {!['ADMIN', 'LEGAL_ADVISOR'].includes(user?.role) && (
          <Link 
            to="/cases/create"
            className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#b45309]" />
            <span>Register New Case</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-750 p-4 rounded-lg flex items-center gap-3 text-xs font-bold" role="alert">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#ffffff] border border-[#e2e8f0] p-4 rounded-lg shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b]">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by FIR number, crime type, or police station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] placeholder-[#64748b]/60 pl-10 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all"
            aria-label="Filter cases search query"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748b]">
            <Filter className="w-4 h-4" />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] pl-10 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all appearance-none"
            aria-label="Filter cases by status"
          >
            <option value="All">All Investigation Statuses</option>
            <option value="active">Active Cases</option>
            <option value="pending_sho_review">Pending SHO Review</option>
            <option value="revision_requested">Revision Requested</option>
            <option value="closed">Closed / Resolved</option>
          </select>
        </div>
      </div>

      {/* Case table */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-[#64748b] text-xs font-bold">Fetching registry folders...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-24 text-center text-[#64748b] text-xs font-bold">
            No matching case records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] font-extrabold uppercase tracking-wider bg-[#eff6ff]">
                  <th className="py-3 px-4">FIR Number</th>
                  <th className="py-3 px-4">Crime Category</th>
                  <th className="py-3 px-4">Police Station</th>
                  <th className="py-3 px-4">Incident Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition-all">
                    <td className="py-4 px-4 font-black text-[#1e293b]">{c.fir_number}</td>
                    <td className="py-4 px-4 text-[#1e293b] font-medium">{c.crime_type}</td>
                    <td className="py-4 px-4 text-[#64748b]">{c.police_station}</td>
                    <td className="py-4 px-4 text-[#64748b] font-medium">
                      {formatDate(c.incident_date)}
                    </td>
                    <td className="py-4 px-4">
                      {formatStatusBadge(c.status)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center items-center gap-3">
                        <Link 
                          to={`/cases/${c.id}`}
                          className="bg-[#ffffff] border border-[#e2e8f0] hover:bg-[#eff6ff] text-[#1e293b] px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-[#1e3a8a]" />
                          <span>Open File</span>
                        </Link>
                        
                        <button
                          onClick={() => handleDelete(c.id, c.fir_number)}
                          className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 p-1.5 rounded-lg transition-all"
                          title="Delete Case Draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cases;
