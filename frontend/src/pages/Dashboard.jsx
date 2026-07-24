import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
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

const CHART_COLORS = ['#111827', '#6b7280', '#16a34a', '#d97706', '#dc2626', '#9ca3af'];

const Dashboard = () => {
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
      <div className="flex-1 flex items-center justify-center min-h-[80vh] bg-white">
        <div className="flex flex-col items-center gap-3 text-gray-500 font-bold text-xs">
          <div className="w-8 h-8 rounded-full border-4 border-gray-900 border-t-transparent animate-spin" />
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
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto bg-white min-h-screen">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-wide uppercase flex items-center gap-2">
            <Shield className="text-gray-900 w-6 h-6" />
            <span>National Dashboard Control</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time analytics, category distributions, case trends, and operational statistics.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 font-bold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-600"></span>
          <span>SYSTEM ONLINE</span>
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
            <div key={i} className="bg-white border border-gray-250 p-4.5 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">{stat.name}</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-xl font-black text-gray-900 tracking-tight">{stat.value}</span>
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend Line Chart */}
        <div className="bg-white border border-gray-250 p-5 rounded-lg shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-950" />
            <span>Weekly Registration Influx</span>
          </h3>
          <div className="h-64">
            {data?.case_trend && data.case_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.case_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="cases" stroke="#111827" strokeWidth={2} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs font-semibold">
                No trend metrics available.
              </div>
            )}
          </div>
        </div>

        {/* Crime Category Pie Chart */}
        <div className="bg-white border border-gray-250 p-5 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-950" />
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
                    <Tooltip contentStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs font-semibold">
                  No distribution details recorded.
                </div>
              )}
            </div>
            
            {/* Pie Chart Legend */}
            {data?.case_distribution && data.case_distribution.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center text-[10px] font-bold text-gray-600 border-t border-gray-100 pt-3">
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
          <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Portal Operations</h3>
          <div className="grid grid-cols-1 gap-3">
            <Link to="/cases/create" className="group bg-white border border-gray-250 p-4.5 rounded-lg hover:border-gray-900 transition-all flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 group-hover:bg-gray-100">
                <FilePlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 group-hover:text-gray-900 uppercase">Register New FIR</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Log new reports and victim details.</p>
              </div>
            </Link>
            <Link to="/documents/generate" className="group bg-white border border-gray-250 p-4.5 rounded-lg hover:border-gray-900 transition-all flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 group-hover:bg-gray-100">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 group-hover:text-gray-900 uppercase">Legal Document Generator</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Draft legal memos and custody reports.</p>
              </div>
            </Link>
            <Link to="/assistant" className="group bg-white border border-gray-250 p-4.5 rounded-lg hover:border-gray-900 transition-all flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 group-hover:bg-gray-100">
                <Sparkles className="w-5 h-5 text-gray-950" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 group-hover:text-gray-900 uppercase">Legal Reference Assistant</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Verified legal reference & Indian criminal code search.</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity Timeline Feed */}
        <div className="bg-white border border-gray-250 p-5 rounded-lg shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-900" />
              <span>Global Activity Feed</span>
            </h3>
            <Link to="/cases" className="text-[10px] text-gray-900 hover:underline font-bold flex items-center gap-0.5">
              <span>All Cases</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
            {data?.recent_activities && data.recent_activities.length > 0 ? (
              data.recent_activities.map((act) => (
                <div key={act.id} className="flex gap-3 text-xs border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-800">{act.event_name}</span>
                      <span className="text-[9px] text-gray-400 font-bold">{new Date(act.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-normal">{act.description}</p>
                    <div className="text-[9px] text-gray-400 font-bold flex items-center gap-2">
                      <span>FIR: {act.fir_number}</span>
                      <span>•</span>
                      <span>By: {act.created_by_name}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-12 text-xs font-semibold">
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
