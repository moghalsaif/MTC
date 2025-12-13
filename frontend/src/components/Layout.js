import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Package, PackageOpen, FolderKanban, AlertTriangle, PackageX, Wrench, LogOut, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      const notifs = [];
      if (response.data.overdue_count > 0) {
        notifs.push({
          id: 'overdue',
          message: `${response.data.overdue_count} item(s) overdue`,
          severity: 'high'
        });
      }
      if (response.data.low_stock_items?.length > 0) {
        notifs.push({
          id: 'low-stock',
          message: `${response.data.low_stock_items.length} item(s) low on stock`,
          severity: 'medium'
        });
      }
      setNotifications(notifs);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/items-out', icon: PackageOpen, label: 'Items Out' },
    { path: '/projects', icon: FolderKanban, label: 'Projects' },
    { path: '/issues', icon: AlertTriangle, label: 'Issues' },
    { path: '/lost-items', icon: PackageX, label: 'Lost Items' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#1B1B1B] noise-bg">
      <nav className="border-b border-[#3F3F46] bg-[#27272A]">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="font-heading text-2xl font-black text-white tracking-tight" data-testid="app-title">
                MACH TRAFFIC CONTROLLER
              </h1>
              <div className="flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-[#F9982E] text-black'
                          : 'text-[#A1A1AA] hover:text-white hover:bg-[#3F3F46]'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative" data-testid="notification-bell">
                <Bell size={20} className="text-[#A1A1AA] hover:text-white cursor-pointer" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{notifications.length}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-white" data-testid="user-name">{user?.name}</div>
                  <div className="text-xs text-[#71717A]" data-testid="user-email">{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  data-testid="logout-button"
                  className="p-2 rounded-sm text-[#A1A1AA] hover:text-white hover:bg-[#3F3F46] transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}