import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, Package, PackageOpen, FolderKanban, AlertTriangle, PackageX, Wrench, LogOut, Sun, Moon } from 'lucide-react';



const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-background noise-bg transition-colors duration-300">
      <nav className="border-b border-border bg-card transition-colors duration-300">
        <div className="max-w-[1920px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-12">
              <h1 className="font-heading text-xl font-black text-foreground tracking-tight" data-testid="app-title">
                MACH TRAFFIC CONTROLLER
              </h1>
              <div className="flex space-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
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
              <span className="text-sm text-muted-foreground" data-testid="user-name">{user?.name}</span>
              <button
                onClick={toggleTheme}
                data-testid="theme-toggle"
                className="p-2 rounded-xl bg-card hover:bg-accent/10 transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} className="text-foreground" /> : <Moon size={18} className="text-foreground" />}
              </button>
              <button
                onClick={logout}
                data-testid="logout-button"
                className="px-4 py-2 rounded-2xl text-foreground bg-card hover:bg-destructive hover:text-destructive-foreground transition-colors font-medium text-sm"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-[1920px] mx-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}