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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
      {/* Government Branding Header */}
      <div className="p-4 border-b border-gray-200 flex flex-col items-center text-center gap-1 bg-white relative">
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute top-3 right-3 text-gray-500 hover:text-gray-900 p-1 rounded-lg"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>

        <Shield className="w-7 h-7 text-gray-900" />
        <div>
          <h1 className="text-xs font-black tracking-wide text-gray-900 uppercase">CrimeGPT Portal</h1>
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block">
            National Registry
          </span>
        </div>
      </div>

      {/* Network Connectivity Status Indicator */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between text-[10px] font-bold text-gray-500">
        <span className="flex items-center gap-1">
          {networkStatus === 'online' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-700">Online</span>
            </>
          ) : networkStatus === 'syncing' ? (
            <>
              <div className="w-3 h-3 rounded-full border border-gray-950 border-t-transparent animate-spin" />
              <span className="text-gray-800">Syncing...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-600">Offline Queue</span>
            </>
          )}
        </span>
        <span className="text-[9px] text-gray-400 uppercase">{user?.role?.toLowerCase()}</span>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="p-3 border-b border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="Search FIR, suspect..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 focus:border-gray-900 text-gray-900 placeholder-gray-400 pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gray-900 transition-all"
            aria-label="Global Case Search"
          />
          <button type="submit" className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-950">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto bg-white">
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
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {user && user.role === 'ADMIN' && (
          <div className="pt-2 mt-2 border-t border-gray-200">
            <Link
              to="/admin"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                location.pathname === '/admin' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-4 h-4 text-gray-900" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Information Profile Footer */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-900 flex-shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-gray-900 truncate">{user?.name}</h4>
            <span className="text-[8px] bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
              {user?.role}
            </span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-1.5 rounded-lg text-xs transition-all font-bold"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Portal</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Top Header (Visible < lg) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between z-40 shadow-sm no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Shield className="w-5 h-5 text-gray-900" />
            <span className="text-xs font-black uppercase text-gray-900">CrimeGPT Portal</span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded uppercase">
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
            className="fixed inset-0 bg-black/40 transition-opacity"
          />
          <div className="relative z-50 h-full flex flex-col max-w-xs w-full bg-white shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
