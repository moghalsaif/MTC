import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, PackageOpen, AlertTriangle, Wrench, PackageX, FolderKanban, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [audit, setAudit] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes] = await Promise.all([axios.get(`${API}/dashboard/stats`)]);
        setStats(statsRes.data);
        if (isAdmin) {
          const auditRes = await axios.get(`${API}/audit/integrity`);
          setAudit(auditRes.data);
        }
      } catch (err) { console.error('Dashboard fetch failed:', err); }
      setLoading(false);
    };
    fetchData();
  }, [isAdmin]);

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const { data } = await axios.post(`${API}/audit/cleanup`);
      toast.success(`Cleaned ${data.total_removed} orphaned records`);
      const auditRes = await axios.get(`${API}/audit/integrity`);
      setAudit(auditRes.data);
    } catch (e) { toast.error('Cleanup failed'); }
    setCleaning(false);
  };

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

      {/* Data Integrity Audit - Admin Only */}
      {isAdmin && audit && (
        <div className={`bg-[#18181B] border rounded-lg p-5 ${audit.total_orphaned > 0 ? 'border-red-500/30' : 'border-emerald-500/30'}`} data-testid="audit-section">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {audit.total_orphaned > 0 ? <ShieldAlert className="text-red-400" size={18} /> : <ShieldCheck className="text-emerald-400" size={18} />}
              <h2 className="font-heading text-lg font-bold text-white">DATA INTEGRITY</h2>
            </div>
            {audit.total_orphaned > 0 && (
              <Button onClick={handleCleanup} disabled={cleaning} data-testid="cleanup-btn" className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-lg text-xs h-8">
                <Trash2 size={12} className="mr-1.5" />{cleaning ? 'Cleaning...' : 'Clean Orphaned Data'}
              </Button>
            )}
          </div>
          {audit.total_orphaned === 0 ? (
            <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-bold">All clear - zero data leakages detected</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-[#0F0F0F] border border-[#232328] rounded-lg px-3 py-2 text-center">
                  <span className="text-xl font-bold text-red-400 font-data">{audit.orphaned_checkouts}</span>
                  <span className="text-[10px] text-[#52525B] block uppercase">Orphaned Checkouts</span>
                </div>
                <div className="bg-[#0F0F0F] border border-[#232328] rounded-lg px-3 py-2 text-center">
                  <span className="text-xl font-bold text-amber-400 font-data">{audit.orphaned_issues}</span>
                  <span className="text-[10px] text-[#52525B] block uppercase">Orphaned Issues</span>
                </div>
                <div className="bg-[#0F0F0F] border border-[#232328] rounded-lg px-3 py-2 text-center">
                  <span className="text-xl font-bold text-amber-400 font-data">{audit.orphaned_lost_items}</span>
                  <span className="text-[10px] text-[#52525B] block uppercase">Orphaned Lost Items</span>
                </div>
                <div className="bg-[#0F0F0F] border border-[#232328] rounded-lg px-3 py-2 text-center">
                  <span className="text-xl font-bold text-amber-400 font-data">{audit.quantity_mismatches}</span>
                  <span className="text-[10px] text-[#52525B] block uppercase">Qty Mismatches</span>
                </div>
              </div>
              <p className="text-xs text-[#52525B]">{audit.total_orphaned} orphaned records found. Click "Clean Orphaned Data" to remove them safely.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
