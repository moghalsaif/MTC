import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, PackageOpen, AlertTriangle, Wrench, PackageX, FolderKanban, Clock, ArrowUpRight, CircleDot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const typeColors = {
  checkout: { bg: 'bg-orange-950/40', border: 'border-orange-900/50', dot: 'bg-[#F9982E]' },
  issue: { bg: 'bg-red-950/40', border: 'border-red-900/50', dot: 'bg-[#EF4444]' },
  lost_item: { bg: 'bg-rose-950/40', border: 'border-rose-900/50', dot: 'bg-[#F43F5E]' },
  maintenance: { bg: 'bg-emerald-950/40', border: 'border-emerald-900/50', dot: 'bg-[#10B981]' },
};

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/dashboard/stats`).then(r => r.data),
      axios.get(`${API}/dashboard/recent-activity`).then(r => r.data).catch(() => []),
    ]).then(([statsData, activityData]) => {
      setStats(statsData);
      setActivities(activityData);
    }).catch(err => console.error('Dashboard fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#71717A] font-data text-sm">LOADING DASHBOARD...</div>
      </div>
    );
  }

  const statCards = [
    { title: 'Items Out', value: stats?.items_currently_out || 0, icon: PackageOpen, color: '#F9982E', action: () => navigate('/items-out'), testId: 'stat-items-out' },
    { title: 'Overdue', value: stats?.overdue_count || 0, icon: AlertTriangle, color: '#EF4444', action: () => navigate('/items-out'), testId: 'stat-overdue' },
    { title: 'Active Projects', value: stats?.active_projects || 0, icon: FolderKanban, color: '#3B82F6', action: () => navigate('/projects'), testId: 'stat-projects' },
    { title: 'Open Issues', value: stats?.open_issues || 0, icon: AlertTriangle, color: '#F59E0B', action: () => navigate('/issues'), testId: 'stat-issues' },
    { title: 'Maintenance', value: stats?.under_maintenance_count || 0, icon: Wrench, color: '#10B981', action: () => navigate('/maintenance'), testId: 'stat-maintenance' },
    { title: 'Lost Items', value: stats?.lost_items_count || 0, icon: PackageX, color: '#EF4444', action: () => navigate('/lost-items'), testId: 'stat-lost' },
    { title: 'Total Items', value: stats?.total_items || 0, icon: Package, color: '#A1A1AA', action: () => navigate('/inventory'), testId: 'stat-total' },
  ];

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight" data-testid="dashboard-title">
            DASHBOARD
          </h1>
          <p className="text-[#52525B] mt-1 text-sm">Equipment status overview</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/inventory')}
            data-testid="quick-mark-out-btn"
            className="px-5 py-2.5 bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
          >
            Mark Out
          </button>
          <button
            onClick={() => navigate('/items-out')}
            data-testid="quick-mark-in-btn"
            className="px-5 py-2.5 bg-transparent border border-[#232328] text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1F] rounded-lg transition-colors font-bold text-xs uppercase tracking-wider"
          >
            Mark In
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={card.action}
              data-testid={card.testId}
              className="bg-[#18181B] border border-[#232328] rounded-lg p-4 text-left transition-all hover:border-[#3F3F46] group"
            >
              <Icon size={16} style={{ color: card.color }} className="mb-2 opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="font-data text-2xl font-bold text-white">{card.value}</div>
              <div className="text-[10px] text-[#52525B] font-medium uppercase tracking-wider mt-1">{card.title}</div>
            </button>
          );
        })}
      </div>

      {/* Overdue Alert */}
      {stats?.overdue_items && stats.overdue_items.length > 0 && (
        <div className="bg-[#18181B] border border-[#EF4444]/30 rounded-lg p-5" data-testid="overdue-section">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="text-[#EF4444]" size={18} />
            <h2 className="font-heading text-lg font-bold text-white">OVERDUE GEAR</h2>
          </div>
          <div className="space-y-2">
            {stats.overdue_items.map((checkout) => (
              <div key={checkout.id} data-testid={`overdue-item-${checkout.id}`} className="bg-[#0F0F0F] border border-[#232328] rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">{checkout.item_name}</div>
                  <div className="text-xs text-[#52525B]">
                    {checkout.project_name} &middot; Expected: {new Date(checkout.expected_return).toLocaleDateString()}
                  </div>
                </div>
                <span className="font-data text-[#EF4444] text-xs font-bold">OVERDUE</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div data-testid="recent-activity-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#52525B]" />
            <h2 className="font-heading text-lg font-bold text-white">RECENT ACTIVITY</h2>
          </div>
          <span className="text-[10px] text-[#3F3F46] uppercase tracking-wider">{activities.length} events</span>
        </div>
        {activities.length === 0 ? (
          <div className="bg-[#18181B] border border-[#232328] rounded-lg p-8 text-center">
            <p className="text-[#3F3F46] text-sm">No recent activity yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activities.map((act, i) => {
              const colors = typeColors[act.type] || typeColors.checkout;
              return (
                <div
                  key={i}
                  data-testid={`activity-item-${i}`}
                  className={`${colors.bg} border ${colors.border} rounded-lg px-4 py-3 flex items-center gap-3 transition-all hover:brightness-110`}
                >
                  <div className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{act.description}</div>
                    <div className="text-[#52525B] text-xs truncate">{act.detail}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-data px-2 py-0.5 rounded ${
                      act.status === 'Active' ? 'bg-[#F9982E]/20 text-[#F9982E]' :
                      act.status === 'Open' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                      act.status === 'Missing' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                      'bg-[#232328] text-[#71717A]'
                    }`}>
                      {act.status}
                    </span>
                    <span className="text-[10px] text-[#3F3F46] font-data whitespace-nowrap">{timeAgo(act.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
