import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDateTime } from '../utils/dateFormatter';
import {
  Briefcase,
  Clock,
  CheckCircle,
  FileText,
  Paperclip,
  Users,
  Shield,
  FilePlus,
  Compass,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const CHART_COLORS = ['#1e3a8a', '#2563eb', '#b45309', '#0284c7', '#475569', '#d97706'];

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/stats');
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('Connection to operational server could not be established.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh] bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3 text-[#64748b] font-bold text-xs">
          <div className="w-8 h-8 rounded-full border-4 border-[#1e3a8a] border-t-transparent animate-spin" />
          <span>Synchronizing Operations Board...</span>
        </div>
      </div>
    );
  }

  const stats = [
    { name: 'Total Cases', value: data?.total_cases ?? 0, icon: Briefcase },
    { name: 'Active Cases', value: data?.active_cases ?? 0, icon: Clock },
    { name: 'Resolved Cases', value: data?.closed_cases ?? 0, icon: CheckCircle },
    { name: 'Documents Generated', value: data?.total_documents ?? 0, icon: FileText },
    { name: 'Evidence Records', value: data?.total_evidence ?? 0, icon: Paperclip },
    { name: 'Active Officers', value: data?.total_police ?? 0, icon: Users },
  ];

  return (
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto bg-[#f8fafc] min-h-screen">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e2e8f0] pb-5">
        <div>
          <h1 className="text-xl font-black text-[#1e293b] tracking-wide uppercase flex items-center gap-2">
            <Shield className="text-[#1e3a8a] w-6 h-6" />
            <span>National Dashboard Control</span>
          </h1>
          <p className="text-xs text-[#64748b] mt-1">
            Real-time analytics, category distributions, case trends, and operational statistics.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-[#ffffff] border border-[#e2e8f0] px-4 py-2 rounded-lg text-[#1e293b] font-bold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span className="text-emerald-700">SYSTEM ONLINE</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 text-xs font-bold">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] p-4.5 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider block">{stat.name}</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-xl font-black text-[#1e293b] tracking-tight">{stat.value}</span>
                <div className="p-2 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a]">
                  <Icon className="w-4 h-4 text-[#1e3a8a]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Line Chart */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-lg shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2563eb]" />
            <span>Weekly Registration Influx</span>
          </h3>
          <div className="h-64">
            {data?.case_trend && data.case_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.case_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: 10, borderRadius: 8, color: '#1e293b' }} />
                  <Line type="monotone" dataKey="cases" stroke="#1e3a8a" strokeWidth={2} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#64748b] text-xs font-semibold">
                No trend metrics available.
              </div>
            )}
          </div>
        </div>

        {/* Crime Category Pie Chart */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2563eb]" />
            <span>Crime Categories</span>
          </h3>
          <div className="h-64 flex flex-col justify-between">
            <div className="flex-1 relative">
              {data?.case_distribution && data.case_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.case_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.case_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: 10, borderRadius: 8, color: '#1e293b' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-[#64748b] text-xs font-semibold">
                  No distribution details recorded.
                </div>
              )}
            </div>
            
            {/* Pie Chart Legend */}
            {data?.case_distribution && data.case_distribution.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center text-[10px] font-bold text-[#64748b] border-t border-[#e2e8f0] pt-3">
                {data.case_distribution.slice(0, 4).map((entry, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                    <span className="truncate max-w-[80px]">{entry.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Panels and Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Actions */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Portal Operations</h3>
          <div className="grid grid-cols-1 gap-3">
            {user?.role === 'POLICE_OFFICER' && (
              <Link to="/cases/create" className="group bg-[#ffffff] border border-[#e2e8f0] p-4.5 rounded-lg hover:border-[#2563eb] transition-all flex items-center gap-4 shadow-sm">
                <div className="p-2.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white transition-all">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#1e293b] group-hover:text-[#1e3a8a] uppercase transition-colors">Register New FIR</h4>
                  <p className="text-[10px] text-[#64748b] mt-0.5">Log new reports and victim details.</p>
                </div>
              </Link>
            )}
            <Link to="/documents/generate" className="group bg-[#ffffff] border border-[#e2e8f0] p-4.5 rounded-lg hover:border-[#2563eb] transition-all flex items-center gap-4 shadow-sm">
              <div className="p-2.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white transition-all">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#1e293b] group-hover:text-[#1e3a8a] uppercase transition-colors">Legal Document Generator</h4>
                <p className="text-[10px] text-[#64748b] mt-0.5">Draft legal memos and custody reports.</p>
              </div>
            </Link>
            <Link to="/assistant" className="group bg-[#ffffff] border border-[#e2e8f0] p-4.5 rounded-lg hover:border-[#2563eb] transition-all flex items-center gap-4 shadow-sm">
              <div className="p-2.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white transition-all">
                <Sparkles className="w-5 h-5 text-[#b45309] group-hover:text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#1e293b] group-hover:text-[#1e3a8a] uppercase transition-colors">Legal Reference Assistant</h4>
                <p className="text-[10px] text-[#64748b] mt-0.5">Verified legal reference & Indian criminal code search.</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity Timeline Feed */}
        <div className="bg-[#ffffff] border border-[#e2e8f0] p-5 rounded-lg shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-3">
            <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2563eb]" />
              <span>Global Activity Feed</span>
            </h3>
            <Link to="/cases" className="text-[10px] text-[#2563eb] hover:underline font-bold flex items-center gap-0.5">
              <span>All Cases</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
            {data?.recent_activities && data.recent_activities.length > 0 ? (
              data.recent_activities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs border-b border-[#e2e8f0] pb-3 last:border-b-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-[#1e293b]">{act.event_name}</span>
                      <span className="text-[9px] text-[#64748b] font-bold">{formatDateTime(act.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-[#64748b] leading-normal">{act.description}</p>
                    <div className="text-[9px] text-[#64748b]/80 font-bold flex items-center gap-2">
                      <span>FIR: {act.fir_number}</span>
                      <span>•</span>
                      <span>By: {act.created_by_name}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-[#64748b] py-12 text-xs font-semibold">
                No recent activity records.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
