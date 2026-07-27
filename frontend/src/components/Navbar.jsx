import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerSyncListeners } from '../services/OfflineSyncManager';
import { 
  LayoutDashboard, 
  Briefcase, 
  PlusCircle, 
  FileText, 
  MessageSquare, 
  LogOut, 
  User,
  Shield,
  Search,
  Wifi,
  WifiOff,
  Menu,
  X
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = registerSyncListeners((status) => {
      setNetworkStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Close drawer automatically on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Cases Inventory', path: '/cases', icon: Briefcase },
    { name: 'Create New Case', path: '/cases/create', icon: PlusCircle },
    { name: 'Document Generator', path: '/documents/generate', icon: FileText },
    { name: 'Document Registry', path: '/documents', icon: FileText },
    { name: 'Legal Reference Assistant', path: '/assistant', icon: MessageSquare },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cases?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileOpen(false);
    }
  };

  const sidebarContent = (
    <aside className="w-64 bg-[#ffffff] border-r border-[#e2e8f0] flex flex-col h-full flex-shrink-0">
      {/* Government Branding Header */}
      <div className="p-4 border-b border-[#e2e8f0] flex flex-col items-center text-center gap-1 bg-[#ffffff] relative">
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute top-3 right-3 text-[#64748b] hover:text-[#1e293b] p-1 rounded-lg"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>

        <Shield className="w-7 h-7 text-[#1e3a8a]" />
        <div>
          <h1 className="text-xs font-black tracking-wide text-[#1e293b] uppercase">CrimeGPT Portal</h1>
          <span className="text-[9px] text-[#b45309] font-bold uppercase tracking-widest block">
            National Police Registry
          </span>
        </div>
      </div>

      {/* Network Connectivity Status Indicator */}
      <div className="px-4 py-2 bg-[#ffffff] border-b border-[#e2e8f0] flex items-center justify-between text-[10px] font-bold text-[#64748b]">
        <span className="flex items-center gap-1">
          {networkStatus === 'online' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Online</span>
            </>
          ) : networkStatus === 'syncing' ? (
            <>
              <div className="w-3 h-3 rounded-full border border-[#1e3a8a] border-t-transparent animate-spin" />
              <span className="text-[#1e3a8a]">Syncing...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#64748b]" />
              <span className="text-[#64748b]">Offline Queue</span>
            </>
          )}
        </span>
        <span className="text-[9px] text-[#64748b]/80 uppercase">{user?.role?.toLowerCase()}</span>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="p-3 border-b border-[#e2e8f0] bg-[#ffffff]">
        <div className="relative">
          <input
            type="text"
            placeholder="Search FIR, suspect..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#ffffff] border border-[#e2e8f0] focus:border-[#2563eb] text-[#1e293b] placeholder-[#64748b]/60 pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#2563eb] transition-all"
            aria-label="Global Case Search"
          />
          <button type="submit" className="absolute left-2.5 top-2.5 text-[#64748b] hover:text-[#1e293b]">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto bg-[#ffffff]">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                isActive 
                  ? 'bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe] shadow-sm font-black' 
                  : 'text-[#64748b] border border-transparent hover:bg-[#f8fafc] hover:text-[#1e293b]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#1e3a8a]' : ''}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {user && user.role === 'ADMIN' && (
          <div className="pt-2 mt-2 border-t border-[#e2e8f0]">
            <Link
              to="/admin"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                location.pathname === '/admin' 
                  ? 'bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe] font-black' 
                  : 'text-[#1e293b] border border-transparent hover:bg-[#f8fafc]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#b45309]" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Information Profile Footer */}
      <div className="p-3 border-t border-[#e2e8f0] bg-[#ffffff]">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-7 h-7 rounded-full bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center text-[#1e3a8a] flex-shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-[#1e293b] truncate">{user?.name}</h4>
            <span className="text-[8px] bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
              {user?.role}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1.5 bg-[#ffffff] hover:bg-[#f8fafc] text-[#1e293b] border border-[#e2e8f0] py-1.5 rounded-lg text-xs transition-all font-bold"
        >
          <LogOut className="w-3.5 h-3.5 text-[#64748b]" />
          <span>Exit Portal</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Top Header (Visible < lg) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#ffffff] border-b border-[#e2e8f0] px-4 flex items-center justify-between z-40 shadow-sm no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 text-[#1e293b] hover:text-[#1e3a8a] hover:bg-[#eff6ff] rounded-lg transition-all"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-5 h-5 text-[#1e3a8a]" />
            <span className="text-xs font-black uppercase text-[#1e293b]">CrimeGPT Portal</span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-[#1e3a8a] bg-[#eff6ff] border border-[#bfdbfe] px-2 py-0.5 rounded uppercase">
          {user?.role}
        </span>
      </header>

      {/* Desktop Sidebar (Visible >= lg) */}
      <div className="hidden lg:flex h-full flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay (< lg) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-[#1e293b]/40 transition-opacity"
          />
          <div className="relative z-50 h-full flex flex-col max-w-xs w-full bg-[#ffffff] shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
