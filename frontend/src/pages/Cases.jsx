import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { 
  Search, 
  Filter, 
  Trash2, 
  FolderOpen, 
  AlertTriangle,
  Plus
} from 'lucide-react';

const Cases = () => {
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
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto bg-white min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-6 gap-4">
        <div>
          <h1 className="text-xl font-black tracking-wide text-gray-900 uppercase">National Case Registry</h1>
          <p className="text-xs text-gray-500 mt-1">Index of registered FIRs, ongoing investigations, and legal records.</p>
        </div>
        <Link 
          to="/cases/create"
          className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Case</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-750 p-4 rounded-lg flex items-center gap-3 text-xs font-bold" role="alert">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by FIR number, crime type, or police station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-350 focus:border-gray-900 text-gray-900 placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all"
            aria-label="Filter cases search query"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
            <Filter className="w-4 h-4" />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white border border-gray-350 focus:border-gray-900 text-gray-900 pl-10 pr-4 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all appearance-none"
            aria-label="Filter cases by status"
          >
            <option value="All">All Investigation Statuses</option>
            <option value="Active">Active Case files</option>
            <option value="Closed">Closed / Resolved</option>
          </select>
        </div>
      </div>

      {/* Case table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-gray-400 text-xs font-bold">Fetching registry folders...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-24 text-center text-gray-400 text-xs font-bold">
            No matching case records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider bg-gray-50">
                  <th className="py-3 px-4">FIR Number</th>
                  <th className="py-3 px-4">Crime Category</th>
                  <th className="py-3 px-4">Police Station</th>
                  <th className="py-3 px-4">Incident Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-all">
                    <td className="py-4 px-4 font-black text-gray-900">{c.fir_number}</td>
                    <td className="py-4 px-4 text-gray-700 font-medium">{c.crime_type}</td>
                    <td className="py-4 px-4 text-gray-500">{c.police_station}</td>
                    <td className="py-4 px-4 text-gray-400 font-medium">
                      {new Date(c.incident_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        c.status.toLowerCase() === 'active' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center items-center gap-3">
                        <Link 
                          to={`/cases/${c.id}`}
                          className="bg-white border border-gray-350 hover:bg-gray-50 text-gray-850 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
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
