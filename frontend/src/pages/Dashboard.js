import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, PackageOpen, AlertTriangle, Wrench, PackageX, FolderKanban, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING DASHBOARD...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Items Currently Out',
      value: stats?.items_currently_out || 0,
      icon: PackageOpen,
      color: 'text-[#F9982E]',
      bgColor: 'bg-orange-950/30',
      borderColor: 'border-orange-900',
      action: () => navigate('/items-out'),
      testId: 'stat-items-out'
    },
    {
      title: 'Overdue Gear',
      value: stats?.overdue_count || 0,
      icon: AlertTriangle,
      color: 'text-[#EF4444]',
      bgColor: 'bg-red-950/30',
      borderColor: 'border-red-900',
      action: () => navigate('/items-out'),
      testId: 'stat-overdue'
    },
    {
      title: 'Active Projects',
      value: stats?.active_projects || 0,
      icon: FolderKanban,
      color: 'text-[#3B82F6]',
      bgColor: 'bg-blue-950/30',
      borderColor: 'border-blue-900',
      action: () => navigate('/projects'),
      testId: 'stat-projects'
    },
    {
      title: 'Open Issues',
      value: stats?.open_issues || 0,
      icon: AlertTriangle,
      color: 'text-[#F59E0B]',
      bgColor: 'bg-amber-950/30',
      borderColor: 'border-amber-900',
      action: () => navigate('/issues'),
      testId: 'stat-issues'
    },
    {
      title: 'Under Maintenance',
      value: stats?.under_maintenance_count || 0,
      icon: Wrench,
      color: 'text-[#10B981]',
      bgColor: 'bg-emerald-950/30',
      borderColor: 'border-emerald-900',
      action: () => navigate('/maintenance'),
      testId: 'stat-maintenance'
    },
    {
      title: 'Lost Items',
      value: stats?.lost_items_count || 0,
      icon: PackageX,
      color: 'text-[#EF4444]',
      bgColor: 'bg-red-950/30',
      borderColor: 'border-red-900',
      action: () => navigate('/lost-items'),
      testId: 'stat-lost'
    },
    {
    {
      title: 'Total Items',
      value: stats?.total_items || 0,
      icon: Package,
      color: 'text-white',
      bgColor: 'bg-[#3F3F46]',
      borderColor: 'border-[#3F3F46]',
      action: () => navigate('/inventory'),
      testId: 'stat-total'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="dashboard-title">
            CONTROL CENTER
          </h1>
          <p className="text-[#A1A1AA] mt-2">Studio equipment status overview</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/inventory')}
            data-testid="quick-mark-out-btn"
            className="px-6 py-3 bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl transition-colors"
          >
            Mark Out
          </button>
          <button
            onClick={() => navigate('/items-out')}
            data-testid="quick-mark-in-btn"
            className="px-6 py-3 bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl transition-colors font-bold uppercase tracking-wider"
          >
            Mark In
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={card.action}
              data-testid={card.testId}
              className={`bg-[#27272A] border ${card.borderColor} rounded-2xl p-6 text-left transition-all hover:scale-105 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`${card.bgColor} ${card.borderColor} border px-2 py-1 rounded-2xl inline-flex items-center mb-3`}>
                    <Icon size={16} className={card.color} />
                  </div>
                  <div className="font-data text-4xl font-bold text-white mb-2">{card.value}</div>
                  <div className="text-sm text-[#A1A1AA] font-medium uppercase tracking-wide">{card.title}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {stats?.overdue_items && stats.overdue_items.length > 0 && (
        <div className="bg-[#27272A] border border-[#EF4444] rounded-2xl p-6" data-testid="overdue-section">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="text-[#EF4444]" size={24} />
            <h2 className="font-heading text-2xl font-bold text-white">OVERDUE GEAR</h2>
          </div>
          <div className="space-y-3">
            {stats.overdue_items.map((checkout) => (
              <div
                key={checkout.id}
                data-testid={`overdue-item-${checkout.id}`}
                className="bg-[#1B1B1B] border border-[#3F3F46] rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-white font-medium">{checkout.item_name}</div>
                  <div className="text-sm text-[#A1A1AA]">
                    Project: {checkout.project_name} • Expected: {new Date(checkout.expected_return).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-data text-[#EF4444] font-bold">OVERDUE</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats?.low_stock_items && stats.low_stock_items.length > 0 && (
        <div className="bg-[#27272A] border border-[#F59E0B] rounded-2xl p-6" data-testid="low-stock-section">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingDown className="text-[#F59E0B]" size={24} />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A1A1AA]">{item.category}</span>
                  <span className="font-data text-[#F59E0B] font-bold">
                    {item.quantity_available} / {item.min_stock}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}