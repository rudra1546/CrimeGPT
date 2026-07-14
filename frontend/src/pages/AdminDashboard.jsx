import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Users, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  RefreshCw 
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
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (err) {
      console.error(err);
      setError(err._parsedMessage || 'Failed retrieving administrative analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="p-8 max-w-md mx-auto mt-20 bg-police-card border border-police-border rounded-2xl shadow-2xl text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-lg font-black text-slate-250 uppercase tracking-widest">Clearance Restrained</h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Access to the administrative control panel requires high-level credentials. Contact the station command unit to request credentials.
        </p>
      </div>
    );
  }

  const CHART_COLORS = ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985'];

  return (
    <div className="p-8 space-y-8 w-full max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-police-border pb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-200 tracking-wide uppercase flex items-center gap-2.5">
            <ShieldAlert className="text-police-accent w-6.5 h-6.5" />
            <span>Admin Command Center</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            System performance telemetry, case categories distribution, and recent activity logs.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="bg-police-border hover:bg-police-border/80 border border-police-border/80 text-police-accent hover:text-police-glow px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400 text-xs font-semibold">
            <RefreshCw className="w-8 h-8 text-police-accent animate-spin" />
            <span className="animate-pulse">Retrieving Administrative Statistics...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/35 p-4 rounded-xl flex items-center gap-3 text-rose-450 text-xs flex-shrink-0">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      ) : stats ? (
        <div className="flex-1 overflow-y-auto space-y-8 pr-1.5 scrollbar-thin">
          {/* Stats Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl flex items-center gap-5 hover:border-police-accent/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-police-accent/10 flex items-center justify-center text-police-accent border border-police-accent/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Police Officers</span>
                <span className="text-3xl font-black text-slate-200 mt-1 block">{stats.total_police}</span>
              </div>
            </div>

            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl flex items-center gap-5 hover:border-police-accent/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-police-glow/10 flex items-center justify-center text-police-glow border border-police-glow/20">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Case Records</span>
                <span className="text-3xl font-black text-slate-200 mt-1 block">{stats.total_cases}</span>
              </div>
            </div>

            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl flex items-center gap-5 hover:border-police-accent/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-450 border border-emerald-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Generated AI Documents</span>
                <span className="text-3xl font-black text-slate-200 mt-1 block">{stats.total_documents}</span>
              </div>
            </div>
          </div>

          {/* Visual Charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Crime Distribution PieChart */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-police-accent" />
                <span>Crime Categories breakdown</span>
              </h3>
              <div className="h-64">
                {stats.case_distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.case_distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.case_distribution.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#070f1e', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No case records found to model categories.
                  </div>
                )}
              </div>
            </div>

            {/* Generated Documents distribution */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-police-glow" />
                <span>Drafted Documents by type</span>
              </h3>
              <div className="h-64">
                {stats.document_distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.document_distribution}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#070f1e', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No legal drafts generated.
                  </div>
                )}
              </div>
            </div>

            {/* Case Trend Timeline */}
            <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-450" />
                <span>Chronological incident trends</span>
              </h3>
              <div className="h-60">
                {stats.case_trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.case_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#070f1e', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="cases" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No incident dates registered.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Investigative Activities */}
          <div className="bg-police-card border border-police-border p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-police-border/40 pb-3 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-police-accent" />
              <span>System-wide recent activities</span>
            </h3>

            {stats.recent_activities.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-police-border select-text">
                {stats.recent_activities.map((act) => (
                  <div key={act.id} className="relative animate-fadeIn text-xs">
                    <span className="absolute -left-[22px] top-1 w-3 h-3 rounded-full border border-police-border bg-police-dark flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-police-accent"></span>
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-200 bg-police-dark border border-police-border px-2 py-0.5 rounded text-[10px] tracking-wide text-police-glow">
                          {act.event_name}
                        </span>
                        <span className="text-[10px] text-slate-550">
                          {new Date(act.timestamp).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          by {act.created_by_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (Case FIR: {act.fir_number})
                        </span>
                      </div>
                      <p className="text-slate-400 pl-1 leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No system activity logged in timelines.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 text-xs">
          No telemetry statistics loaded.
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
