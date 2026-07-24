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
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  UserX,
  Eye,
  Shield,
  X,
  UserPlus,
  Trash2,
  History,
  FileCheck
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

const CHART_COLORS = ['#111827', '#6b7280', '#16a34a', '#d97706', '#dc2626', '#9ca3af'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');

  // Tab State: 'active_users' | 'audit_history'
  const [activeTab, setActiveTab] = useState('active_users');

  // User Directory state
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [userError, setUserError] = useState('');
  
  // Filtering & Search states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State for viewing user profile
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (err) {
      console.error(err);
      setStatsError(err._parsedMessage || 'Failed retrieving operational statistics.');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Include deleted users so audit view can display all records
      const response = await api.get('/admin/users?include_deleted=true');
      setUsersList(response.data.users || []);
    } catch (err) {
      console.error(err);
      setUserError(err._parsedMessage || 'Failed retrieving personnel directory.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const response = await api.get('/admin/user-audit-logs');
      setAuditLogs(response.data.audit_logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchStats();
      fetchUsers();
      fetchAuditLogs();
    } else {
      setLoadingStats(false);
      setLoadingUsers(false);
    }
  }, [user]);

  const handleToggleStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`CONFIRMATION REQUIRED:\nAre you sure you want to change account status for "${targetUser.name}" to ${newStatus}?`)) {
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      const res = await api.put(`/admin/users/${targetUser.id}/status`, { status: newStatus });
      setUsersList(prev => prev.map(u => u.id === targetUser.id ? { ...u, status: res.data.status || newStatus } : u));
      if (selectedUser && selectedUser.id === targetUser.id) {
        setSelectedUser(prev => ({ ...prev, status: res.data.status || newStatus }));
      }
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || "Failed updating personnel account status.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleChangeRole = async (targetUser, newRole) => {
    if (!newRole || newRole === targetUser.role) return;
    if (!window.confirm(`CONFIRMATION REQUIRED:\nAre you sure you want to update clearance role for "${targetUser.name}" to ${formatRoleName(newRole)}?`)) {
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      const res = await api.put(`/admin/users/${targetUser.id}/role`, { role: newRole });
      setUsersList(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: res.data.role || newRole } : u));
      if (selectedUser && selectedUser.id === targetUser.id) {
        setSelectedUser(prev => ({ ...prev, role: res.data.role || newRole }));
      }
      alert("Clearance role updated successfully.");
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || "Failed updating personnel role clearance.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`CONFIRMATION REQUIRED:\nAre you sure you want to delete user account "${targetUser.name}" (${targetUser.email})?\n\nThis will mark the user as DELETED while preserving history records.`)) {
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      const res = await api.delete(`/admin/users/${targetUser.id}`);
      const deletedName = res.data?.name || targetUser.name;
      alert(`User deleted successfully: ${deletedName}`);
      
      if (selectedUser && selectedUser.id === targetUser.id) {
        setSelectedUser(null);
      }

      // Automatically refresh user list and audit logs
      fetchUsers();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      alert(err._parsedMessage || "Failed deleting user account.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatRoleName = (roleStr) => {
    switch (roleStr?.toUpperCase()) {
      case 'ADMIN':
        return 'Administrative Officer';
      case 'SHO':
        return 'Station House Officer (SHO)';
      case 'LEGAL_ADVISOR':
        return 'Legal Advisor';
      case 'POLICE_OFFICER':
      default:
        return 'Police Officer / Investigator';
    }
  };

  const getRoleBadgeStyle = (roleStr) => {
    switch (roleStr?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SHO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LEGAL_ADVISOR':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'POLICE_OFFICER':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-250';
    }
  };

  const getStatusBadge = (statusStr) => {
    switch (statusStr?.toUpperCase()) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">
            🟢 Active Account
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
            🟡 Deactivated Account
          </span>
        );
      case 'DELETED':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
            🔴 User Deleted
          </span>
        );
    }
  };

  // Filter users list based on active tab and search criteria
  const activeUsers = usersList.filter(u => u.status !== 'DELETED');
  const deletedOrHistoryUsers = usersList;

  const targetUsersList = activeTab === 'active_users' ? activeUsers : deletedOrHistoryUsers;

  const filteredUsers = targetUsersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          (u.station && u.station.toLowerCase().includes(userSearchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = log.user_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          log.user_email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          log.performed_by.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || log.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || log.status_after_action === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="p-8 max-w-md mx-auto mt-20 bg-white border border-gray-250 rounded-lg shadow-sm text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-650 mx-auto" />
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Clearance Restrained</h2>
        <p className="text-gray-500 text-xs leading-relaxed">
          Access to the administrative command portal requires high-level credentials. Contact the station command unit to request clearance.
        </p>
      </div>
    );
  }

  const inputClass = "bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-xs outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all";
  const selectClass = "bg-white border border-gray-300 text-gray-900 py-2 px-3 rounded-lg text-xs outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all";

  return (
    <div className="p-8 space-y-8 w-full max-w-7xl mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-wide uppercase flex items-center gap-2.5">
            <Shield className="text-gray-900 w-6 h-6" />
            <span>Admin Command Center</span>
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Operational statistics, registered personnel management, and system-wide audit history.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchStats(); fetchUsers(); fetchAuditLogs(); }}
            disabled={loadingStats || loadingUsers}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wide"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats || loadingUsers ? 'animate-spin' : ''}`} />
            <span>Refresh Portal</span>
          </button>
        </div>
      </div>

      {statsError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 text-red-750 text-xs font-bold" role="alert">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{statsError}</span>
        </div>
      )}

      {/* 1. Summary Statistics Row */}
      {loadingStats ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-2 text-gray-400 text-xs font-bold">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Loading statistics...</span>
          </div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-250 p-6 rounded-lg shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-gray-900 border border-gray-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Registered Police Officers</span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">{stats.total_police}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-250 p-6 rounded-lg shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-gray-900 border border-gray-200">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Total Case Records</span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">{stats.total_cases}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-250 p-6 rounded-lg shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-gray-900 border border-gray-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Generated Legal Documents</span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">{stats.total_documents}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Registered Personnel Directory & Audit History System */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden space-y-4 p-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 justify-between items-center pb-3">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('active_users')}
              className={`text-xs font-black uppercase tracking-wider pb-2 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'active_users' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Active Personnel Directory ({activeUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit_history')}
              className={`text-xs font-black uppercase tracking-wider pb-2 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'audit_history' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span>User Audit History & Records ({usersList.length})</span>
            </button>
          </div>
        </div>

        {userError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{userError}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-gray-50 p-3.5 rounded-lg border border-gray-200">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              placeholder="Search personnel by name, email, station..."
              className={`${inputClass} w-full pl-9`}
              aria-label="Search registered personnel"
            />
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            {/* Filter by Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={selectClass}
              aria-label="Filter personnel by clearance role"
            >
              <option value="all">All Clearance Roles</option>
              <option value="POLICE_OFFICER">Police Officer / Investigator</option>
              <option value="SHO">Station House Officer (SHO)</option>
              <option value="LEGAL_ADVISOR">Legal Advisor</option>
              <option value="ADMIN">Administrative Officer</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
              aria-label="Filter personnel by account status"
            >
              <option value="all">All Account Statuses</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="INACTIVE">Deactivated Accounts</option>
              <option value="DELETED">Deleted Accounts</option>
            </select>
          </div>
        </div>

        {/* TAB 1: Active & Operational Personnel Directory Table */}
        {activeTab === 'active_users' && (
          <div>
            {loadingUsers ? (
              <div className="py-16 text-center text-gray-400 text-xs font-bold flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-900" />
                <span>Retrieving personnel records...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs font-bold border border-dashed border-gray-250 rounded-lg">
                No active personnel records match the search filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase text-[9px] tracking-wider">
                      <th className="py-3 px-4">Officer / Personnel Name</th>
                      <th className="py-3 px-4">Clearance Role</th>
                      <th className="py-3 px-4">Assigned Police Station</th>
                      <th className="py-3 px-4 text-center">Account Status</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4">Registered On</th>
                      <th className="py-3 px-4 text-center">Account Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-bold text-gray-700">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-black text-gray-900 block">{u.name}</span>
                            <span className="text-[10px] text-gray-500 font-medium block">{u.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getRoleBadgeStyle(u.role)}`}>
                              {formatRoleName(u.role)}
                            </span>
                            <select
                              value={u.role}
                              disabled={updatingUserId === u.id}
                              onChange={(e) => handleChangeUserRole(u, e.target.value)}
                              className="text-[10px] border border-gray-250 rounded px-1.5 py-0.5 bg-white font-semibold outline-none focus:border-gray-900"
                              title="Modify Clearance Role"
                            >
                              <option value="POLICE_OFFICER">Police Officer</option>
                              <option value="SHO">SHO</option>
                              <option value="LEGAL_ADVISOR">Legal Advisor</option>
                              <option value="ADMIN">Administrative Officer</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-semibold">{u.station || 'Central Police Station'}</td>
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(u.status)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium text-[11px]">{u.last_login_at || 'Never'}</td>
                        <td className="py-3.5 px-4 text-gray-450 font-medium text-[11px]">{u.created_at}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedUser(u)}
                              className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              disabled={updatingUserId === u.id}
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                u.status === 'ACTIVE'
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                  : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                              }`}
                            >
                              {u.status === 'ACTIVE' ? (
                                <>
                                  <UserX className="w-3 h-3" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>Activate</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={updatingUserId === u.id}
                              onClick={() => handleDeleteUser(u)}
                              className="bg-white border border-red-200 hover:bg-red-50 text-red-700 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
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
        )}

        {/* TAB 2: Complete User Audit Log & History Directory */}
        {activeTab === 'audit_history' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-gray-900" />
                <span>Complete User Account History & Audit Records</span>
              </h3>
              <p className="text-[10px] text-gray-500">
                Preserved historical directory showing active, deactivated, and deleted user accounts with exact audit timestamps. Passwords remain 100% encrypted and protected.
              </p>
            </div>

            {/* Audit History Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-extrabold uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4 text-center">Account Status</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4 text-center">Record Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-bold text-gray-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={`transition-all ${u.status === 'DELETED' ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="py-3.5 px-4 font-black text-gray-900">{u.name}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getRoleBadgeStyle(u.role)}`}>
                          {formatRoleName(u.role)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(u.status)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium text-[11px]">{u.created_at}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-medium text-[11px]">{u.last_login_at || 'Never'}</td>
                      <td className="py-3.5 px-4 text-center">
                        {u.status === 'DELETED' ? (
                          <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded uppercase">
                            🔴 User Deleted
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-2 py-1 rounded text-[10px] font-bold"
                          >
                            View Record
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Audit Log Events List */}
            {filteredAuditLogs.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-150">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-gray-900" />
                  <span>Administrative User Action Audit Timeline</span>
                </h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto text-xs">
                  {filteredAuditLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-b-0">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900">{log.user_name}</span>
                          <span className="text-[10px] text-gray-500">({log.user_email})</span>
                          <span className="text-[9px] bg-gray-900 text-white font-black px-1.5 py-0.5 rounded uppercase">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-normal">{log.details}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] text-gray-400 font-bold block">{log.timestamp}</span>
                        <span className="text-[9px] text-gray-500 font-semibold block">By: {log.performed_by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Visual Charts section */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Crime Distribution PieChart */}
          <div className="bg-white border border-gray-250 p-6 rounded-lg shadow-sm space-y-4">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b border-gray-150 pb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-950" />
              <span>Crime Categories Breakdown</span>
            </h3>
            <div className="h-64">
              {stats.case_distribution && stats.case_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.case_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#111827"
                      dataKey="value"
                    >
                      {stats.case_distribution.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} Cases`, 'Total Recorded']}
                      labelFormatter={(name) => `Category: ${name}`}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                  No case records found to model categories.
                </div>
              )}
            </div>
          </div>

          {/* Generated Documents distribution Widget Redesign */}
          <div className="bg-white border border-gray-250 p-6 rounded-lg shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-900" />
                <span>Generated Documents by Type</span>
              </h3>
              {stats.document_distribution && stats.document_distribution.length > 0 && (
                <span className="text-[10px] font-black bg-gray-900 text-white px-2.5 py-1 rounded tracking-wide uppercase">
                  Total: {stats.document_distribution.reduce((acc, curr) => acc + (curr.value || 0), 0)} Documents
                </span>
              )}
            </div>

            {stats.document_distribution && stats.document_distribution.length > 0 ? (
              <div className="space-y-4">
                {/* Clear Document Statistics Summary Breakdown */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Document Type Statistics
                  </span>
                  <div className="grid grid-cols-1 gap-2 text-xs font-bold text-gray-800">
                    {stats.document_distribution.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-md">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-900"></span>
                          <span className="font-black text-gray-900">{item.name}</span>
                        </span>
                        <span className="text-gray-950 font-extrabold bg-white border border-gray-200 px-2.5 py-0.5 rounded text-[11px]">
                          {item.value} {item.value === 1 ? 'Document' : 'Documents'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Bar Chart for Multiple Categories or Single Display */}
                {stats.document_distribution.length > 1 ? (
                  <div className="h-48 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.document_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <XAxis 
                          dataKey="name" 
                          stroke="#6b7280" 
                          fontSize={10} 
                          tickLine={false}
                          interval={0}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={10} 
                          tickLine={false} 
                          allowDecimals={false}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value} Documents`, 'Generated Count']}
                          labelFormatter={(label) => `Document Type: ${label}`}
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#111827' }}
                        />
                        <Bar dataKey="value" fill="#111827" radius={[4, 4, 0, 0]} name="Documents" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center space-y-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
                      Single Category Operational Summary
                    </span>
                    <span className="text-xs font-black text-gray-900 block">
                      {stats.document_distribution[0].name} ({stats.document_distribution[0].value} {stats.document_distribution[0].value === 1 ? 'Document' : 'Documents'})
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-xs font-bold border border-dashed border-gray-200 rounded-lg">
                No legal document drafts generated.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-250 w-full max-w-lg rounded-lg shadow-xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white px-6 py-4.5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-900" />
                <span>Personnel Record Profile</span>
              </h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Full Name</span>
                  <span className="font-black text-gray-900 text-sm">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Authorized Email</span>
                  <span className="font-bold text-gray-800">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Assigned Clearance Role</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getRoleBadgeStyle(selectedUser.role)}`}>
                    {formatRoleName(selectedUser.role)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Police Station</span>
                  <span className="font-bold text-gray-800">{selectedUser.station || 'Central Police Station'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Account Status</span>
                  {getStatusBadge(selectedUser.status)}
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Last Activity / Login</span>
                  <span className="font-bold text-gray-700">{selectedUser.last_login_at || 'Never'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Registration Date</span>
                  <span className="font-bold text-gray-700">{selectedUser.created_at}</span>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex justify-end gap-2.5 pt-2">
                {selectedUser.status !== 'DELETED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(selectedUser)}
                      disabled={updatingUserId === selectedUser.id}
                      className={`px-3 py-2 rounded text-xs font-bold transition-all border ${
                        selectedUser.status === 'ACTIVE'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                      }`}
                    >
                      {selectedUser.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteUser(selectedUser)}
                      disabled={updatingUserId === selectedUser.id}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete User</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Close File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
