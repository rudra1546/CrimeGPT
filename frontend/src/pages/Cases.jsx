import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-police-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">National Case Registry</h1>
          <p className="text-sm text-slate-400 mt-1">Index of registered FIRs, ongoing investigations, and legal records.</p>
        </div>
        <Link 
          to="/cases/create"
          className="bg-police-accent hover:bg-police-accent/90 text-police-dark font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-police-accent/15 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Register New Case</span>
        </Link>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-police-card border border-police-border p-4 rounded-xl shadow-lg">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by FIR number, crime type, or police station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 placeholder-slate-650 pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Filter className="w-4 h-4" />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-police-dark border border-police-border focus:border-police-accent text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none appearance-none"
          >
            <option value="All">All Investigation Statuses</option>
            <option value="Active">Active Case files</option>
            <option value="Closed">Closed / Resolved</option>
          </select>
        </div>
      </div>

      {/* Case table */}
      <div className="bg-police-card border border-police-border rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-500 text-sm">Fetching registry folders...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            No matching case records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-police-border/60 text-slate-400 text-xs uppercase tracking-wider bg-police-dark/30">
                  <th className="py-3 px-4 font-bold">FIR Number</th>
                  <th className="py-3 px-4 font-bold">Crime Category</th>
                  <th className="py-3 px-4 font-bold">Police Station</th>
                  <th className="py-3 px-4 font-bold">Incident Date</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-center">Action Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-police-border/40">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-police-dark/20 transition-all">
                    <td className="py-4.5 px-4 font-bold text-police-glow">{c.fir_number}</td>
                    <td className="py-4.5 px-4 text-slate-300 font-medium">{c.crime_type}</td>
                    <td className="py-4.5 px-4 text-slate-400">{c.police_station}</td>
                    <td className="py-4.5 px-4 text-slate-400">
                      {new Date(c.incident_date).toLocaleDateString()}
                    </td>
                    <td className="py-4.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        c.status.toLowerCase() === 'active' 
                          ? 'bg-amber-950/40 border border-amber-900/50 text-amber-400' 
                          : 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4.5 px-4">
                      <div className="flex justify-center items-center gap-3">
                        <Link 
                          to={`/cases/${c.id}`}
                          className="bg-police-border/40 hover:bg-police-border border border-police-border/80 hover:border-police-accent/30 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Open File</span>
                        </Link>
                        
                        <button
                          onClick={() => handleDelete(c.id, c.fir_number)}
                          className="bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/30 hover:border-rose-700/50 text-rose-400 hover:text-rose-300 p-1.5 rounded-lg transition-all"
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
