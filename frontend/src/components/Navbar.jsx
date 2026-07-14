import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Briefcase, 
  PlusCircle, 
  FileText, 
  MessageSquare, 
  LogOut, 
  User,
  ShieldAlert
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Cases Inventory', path: '/cases', icon: Briefcase },
    { name: 'Create New Case', path: '/cases/create', icon: PlusCircle },
    { name: 'AI Gen Portal', path: '/documents/generate', icon: FileText },
    { name: 'Document Registry', path: '/documents', icon: FileText },
    { name: 'Legal AI Assistant', path: '/assistant', icon: MessageSquare },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-police-card border-r border-police-border flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-police-border flex items-center gap-3">
        <ShieldAlert className="w-8 h-8 text-police-accent animate-pulse" />
        <div>
          <h1 className="text-xl font-bold tracking-wider text-slate-100">CrimeGPT</h1>
          <span className="text-[10px] text-police-accent uppercase tracking-widest font-semibold">National Portal</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-police-border text-police-glow border-l-4 border-police-accent pl-3 shadow-lg shadow-police-dark/30' 
                  : 'text-slate-400 hover:bg-police-dark hover:text-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {user && user.role === 'ADMIN' && (
          <div className="pt-4 mt-4 border-t border-police-border/40">
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === '/admin' 
                  ? 'bg-police-border text-police-glow border-l-4 border-police-accent pl-3 shadow-lg shadow-police-dark/30' 
                  : 'text-rose-400/80 hover:bg-police-dark hover:text-rose-300'
              }`}
            >
              <ShieldAlert className="w-5 h-5 text-rose-500/80" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Information Profile Footer */}
      <div className="p-4 border-t border-police-border bg-police-dark/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-police-border flex items-center justify-center text-police-accent">
            <User className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-slate-200 truncate">{user?.name}</h4>
            <span className="text-[10px] bg-police-border text-police-accent px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
              {user?.role}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 border border-rose-900/50 hover:border-rose-700/50 py-2 rounded-lg text-sm transition-all duration-250 font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Portal</span>
        </button>
      </div>
    </aside>
  );
};

export default Navbar;
