import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  ShieldAlert, 
  Clock, 
  Briefcase, 
  FileCheck, 
  FolderPlus, 
  FileSignature, 
  Bot,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/cases/');
        setCases(response.data);
      } catch (err) {
        console.error("Failed fetching dashboard details:", err);
        setError('Connection to backend portal could not be established.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const totalCases = cases.length;
  const activeCases = cases.filter(c => c.status.toLowerCase() === 'active').length;
  const closedCases = cases.filter(c => c.status.toLowerCase() === 'closed').length;

  const stats = [
    { name: 'Total Cases Registered', value: totalCases, icon: Briefcase, color: 'text-police-accent', border: 'border-police-accent/20' },
    { name: 'Active Investigations', value: activeCases, icon: Clock, color: 'text-amber-400', border: 'border-amber-500/20' },
    { name: 'Resolved / Closed Cases', value: closedCases, icon: FileCheck, color: 'text-emerald-400', border: 'border-emerald-500/20' },
  ];

  return (
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-police-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">Portal Control Board</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time surveillance overview, registry indexing metrics, and AI assistant actions.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-police-card border border-police-border px-4 py-2 rounded-xl text-slate-300 font-semibold tracking-wide shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>SYSTEM ONLINE</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/20 border border-rose-900/50 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className={`bg-police-card border ${stat.border} p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-police-dark/50 hover:border-police-accent/30 transition-all duration-350`}
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">{stat.name}</span>
                <span className="text-4xl font-black text-slate-100 mt-2 block tracking-tight">
                  {loading ? '...' : stat.value}
                </span>
              </div>
              <div className={`p-4 bg-police-dark/80 rounded-2xl border border-police-border/50 ${stat.color}`}>
                <Icon className="w-8 h-8" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Panels */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Core Portal Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create case */}
          <Link 
            to="/cases/create"
            className="group bg-gradient-to-br from-police-card to-police-card/90 border border-police-border hover:border-police-accent/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-48 transition-all hover:-translate-y-1"
          >
            <div className="p-3 bg-police-dark/80 rounded-xl w-fit border border-police-border/50 text-police-accent">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-100 tracking-wide group-hover:text-police-glow transition-all">Register New FIR</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">File new incident reports, assign IPC/BNS categories, and compile victim details.</p>
            </div>
          </Link>

          {/* AI document generation */}
          <Link 
            to="/documents/generate"
            className="group bg-gradient-to-br from-police-card to-police-card/90 border border-police-border hover:border-police-accent/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-48 transition-all hover:-translate-y-1"
          >
            <div className="p-3 bg-police-dark/80 rounded-xl w-fit border border-police-border/50 text-police-accent">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-100 tracking-wide group-hover:text-police-glow transition-all">AI Document Center</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Draft legal documents: Seizure Memos, Charge Sheets, and Custody Remands.</p>
            </div>
          </Link>

          {/* Legal AI Chatbot */}
          <Link 
            to="/assistant"
            className="group bg-gradient-to-br from-police-card to-police-card/90 border border-police-border hover:border-police-accent/50 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-48 transition-all hover:-translate-y-1"
          >
            <div className="p-3 bg-police-dark/80 rounded-xl w-fit border border-police-border/50 text-police-accent">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-100 tracking-wide group-hover:text-police-glow transition-all">AI Legal Co-Pilot</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Search legal reference databases via vector RAG, upload custom PDFs, and ask queries.</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Latest cases list */}
      <div className="bg-police-card border border-police-border rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-200 tracking-wide">Recent Investigational Cases</h3>
          <Link to="/cases" className="text-xs text-police-accent hover:text-police-glow font-semibold flex items-center gap-1">
            <span>View All Records</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-500 text-sm">Loading latest cases registry...</div>
        ) : cases.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No cases registered. Click "Register New FIR" to begin.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-police-border/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">FIR Number</th>
                  <th className="py-3 px-4 font-bold">Crime Category</th>
                  <th className="py-3 px-4 font-bold">Assigned Station</th>
                  <th className="py-3 px-4 font-bold">Incident Date</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Registry File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-police-border/40">
                {cases.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-police-dark/30 transition-all">
                    <td className="py-4 px-4 font-bold text-police-glow">{c.fir_number}</td>
                    <td className="py-4 px-4 text-slate-300">{c.crime_type}</td>
                    <td className="py-4 px-4 text-slate-400">{c.police_station}</td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(c.incident_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        c.status.toLowerCase() === 'active' 
                          ? 'bg-amber-950/40 border border-amber-900/50 text-amber-400' 
                          : 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link 
                        to={`/cases/${c.id}`} 
                        className="inline-flex items-center gap-1 text-xs bg-police-border/50 hover:bg-police-border border border-police-border/80 hover:border-police-accent/30 text-slate-300 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <span>Open File</span>
                      </Link>
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

export default Dashboard;
