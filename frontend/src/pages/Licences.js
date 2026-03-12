import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, CreditCard, Trash2, Pencil, AlertTriangle, TrendingUp, FolderOpen, Eye, EyeOff, HardDrive } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Licences() {
  const { canDeleteLicences } = useAuth();
  const [licences, setLicences] = useState([]);
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscriptions');
  
  // Password visibility
  const [visiblePasswords, setVisiblePasswords] = useState({});
  
  // Licence dialogs
  const [addLicenceDialog, setAddLicenceDialog] = useState(false);
  const [editLicenceDialog, setEditLicenceDialog] = useState(false);
  const [editingLicence, setEditingLicence] = useState(null);
  const [newLicenceForm, setNewLicenceForm] = useState({
    name: '', vendor: '', category: 'Software', licence_type: 'Annual',
    cost_per_period: '', billing_period: 'Monthly', renewal_date: '',
    status: 'Active', seats: '', account_email: '', account_password: '', notes: ''
  });
  const [editLicenceForm, setEditLicenceForm] = useState({
    name: '', vendor: '', category: 'Software', licence_type: 'Annual',
    cost_per_period: '', billing_period: 'Monthly', renewal_date: '',
    status: 'Active', seats: '', account_email: '', account_password: '', notes: ''
  });
  
  // Asset dialogs
  const [addAssetDialog, setAddAssetDialog] = useState(false);
  const [editAssetDialog, setEditAssetDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [newAssetForm, setNewAssetForm] = useState({
    name: '', vendor: '', category: 'Stock Footage', purchase_date: '',
    purchase_price: '', project_id: '', storage_location: '',
    licence_type: 'Royalty-free', notes: ''
  });
  const [editAssetForm, setEditAssetForm] = useState({
    name: '', vendor: '', category: 'Stock Footage', purchase_date: '',
    purchase_price: '', project_id: '', storage_location: '',
    licence_type: 'Royalty-free', notes: ''
  });

  useEffect(() => {
    fetchLicences();
    fetchStats();
    fetchAssets();
    fetchProjects();
  }, []);

  const fetchLicences = async () => {
    try {
      const response = await axios.get(`${API}/licences`);
      setLicences(response.data);
    } catch (error) {
      console.error('Failed to fetch licences:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/licences/stats/summary`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API}/assets`);
      setAssets(response.data);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  // Licence handlers
  const handleAddLicence = async () => {
    if (!newLicenceForm.name || !newLicenceForm.vendor || !newLicenceForm.cost_per_period) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      await axios.post(`${API}/licences`, {
        ...newLicenceForm,
        cost_per_period: parseFloat(newLicenceForm.cost_per_period),
        seats: newLicenceForm.seats ? parseInt(newLicenceForm.seats) : null
      });
      toast.success('Licence added');
      setAddLicenceDialog(false);
      setNewLicenceForm({
        name: '', vendor: '', category: 'Software', licence_type: 'Annual',
        cost_per_period: '', billing_period: 'Monthly', renewal_date: '',
        status: 'Active', seats: '', account_email: '', account_password: '', notes: ''
      });
      fetchLicences();
      fetchStats();
    } catch (error) {
      toast.error('Failed to add licence');
    }
  };

  const openEditLicence = (licence) => {
    setEditingLicence(licence);
    setEditLicenceForm({
      name: licence.name || '',
      vendor: licence.vendor || '',
      category: licence.category || 'Software',
      licence_type: licence.licence_type || 'Annual',
      cost_per_period: licence.cost_per_period?.toString() || '',
      billing_period: licence.billing_period || 'Monthly',
      renewal_date: licence.renewal_date ? licence.renewal_date.split('T')[0] : '',
      status: licence.status || 'Active',
      seats: licence.seats?.toString() || '',
      account_email: licence.account_email || '',
      account_password: licence.account_password || '',
      notes: licence.notes || ''
    });
    setEditLicenceDialog(true);
  };

  const handleUpdateLicence = async () => {
    if (!editLicenceForm.name) {
      toast.error('Please enter licence name');
      return;
    }
    try {
      await axios.put(`${API}/licences/${editingLicence.id}`, {
        ...editLicenceForm,
        cost_per_period: parseFloat(editLicenceForm.cost_per_period),
        seats: editLicenceForm.seats ? parseInt(editLicenceForm.seats) : null
      });
      toast.success('Licence updated');
      setEditLicenceDialog(false);
      fetchLicences();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update licence');
    }
  };

  const handleDeleteLicence = async (licenceId) => {
    if (!window.confirm('Delete this licence?')) return;
    try {
      await axios.delete(`${API}/licences/${licenceId}`);
      toast.success('Licence deleted');
      fetchLicences();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete licence');
    }
  };

  // Asset handlers
  const handleAddAsset = async () => {
    if (!newAssetForm.name || !newAssetForm.vendor || !newAssetForm.storage_location) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      await axios.post(`${API}/assets`, {
        ...newAssetForm,
        purchase_price: newAssetForm.purchase_price ? parseFloat(newAssetForm.purchase_price) : null,
        project_id: newAssetForm.project_id || null
      });
      toast.success('Asset added');
      setAddAssetDialog(false);
      setNewAssetForm({
        name: '', vendor: '', category: 'Stock Footage', purchase_date: '',
        purchase_price: '', project_id: '', storage_location: '',
        licence_type: 'Royalty-free', notes: ''
      });
      fetchAssets();
    } catch (error) {
      toast.error('Failed to add asset');
    }
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setEditAssetForm({
      name: asset.name || '',
      vendor: asset.vendor || '',
      category: asset.category || 'Stock Footage',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
      purchase_price: asset.purchase_price?.toString() || '',
      project_id: asset.project_id || '',
      storage_location: asset.storage_location || '',
      licence_type: asset.licence_type || 'Royalty-free',
      notes: asset.notes || ''
    });
    setEditAssetDialog(true);
  };

  const handleUpdateAsset = async () => {
    if (!editAssetForm.name) {
      toast.error('Please enter asset name');
      return;
    }
    try {
      await axios.put(`${API}/assets/${editingAsset.id}`, {
        ...editAssetForm,
        purchase_price: editAssetForm.purchase_price ? parseFloat(editAssetForm.purchase_price) : null,
        project_id: editAssetForm.project_id || null
      });
      toast.success('Asset updated');
      setEditAssetDialog(false);
      fetchAssets();
    } catch (error) {
      toast.error('Failed to update asset');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await axios.delete(`${API}/assets/${assetId}`);
      toast.success('Asset deleted');
      fetchAssets();
    } catch (error) {
      toast.error('Failed to delete asset');
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Active': 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
      'Expiring Soon': 'bg-orange-950/30 text-orange-400 border-orange-900',
      'Expired': 'bg-red-950/30 text-red-400 border-red-900',
      'Cancelled': 'bg-[#3F3F46] text-[#71717A] border-[#3F3F46]'
    };
    return badges[status] || 'bg-[#3F3F46] text-white border-[#3F3F46]';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Software': '#8B5CF6', 'Hardware': '#F59E0B', 'Service': '#10B981',
      'Cloud': '#3B82F6', 'Support': '#EC4899', 'Other': '#71717A',
      'Stock Footage': '#06B6D4', '3D Models': '#F97316', 'Sound Effects': '#A855F7',
      'Music': '#EF4444', 'Templates': '#84CC16', 'Plugins': '#6366F1',
      'Environments': '#14B8A6', 'Motion Capture': '#F43F5E'
    };
    return colors[category] || colors['Other'];
  };

  const getLicenceTypeColor = (type) => {
    const colors = {
      'Monthly': '#3B82F6',
      'Annual': '#8B5CF6',
      'Lifetime': '#10B981'
    };
    return colors[type] || '#71717A';
  };

  // INR Formatter
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateAnnualCost = (cost, period) => {
    if (period === 'Monthly') return cost * 12;
    if (period === 'Quarterly') return cost * 4;
    return cost;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING...</div>
      </div>
    );
  }

  const categoryBreakdown = stats?.by_category ? Object.entries(stats.by_category).sort((a, b) => b[1] - a[1]) : [];
  const totalAnnual = stats?.total_annual_spend || 0;
  const totalAssetValue = assets.reduce((sum, a) => sum + (a.purchase_price || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-black text-white tracking-tight">LICENCES & ASSETS</h1>
          <p className="text-[#71717A] text-sm mt-1">Subscriptions and purchased asset packs</p>
        </div>
      </div>

      {/* Spend Overview - SEPARATED */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subscription Spend Card */}
        <div className="bg-gradient-to-br from-[#8B5CF6]/20 to-[#1B1B1B] border border-[#8B5CF6]/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[#8B5CF6] text-xs uppercase tracking-wider font-medium">Recurring Subscriptions</div>
            <CreditCard size={20} className="text-[#8B5CF6]" />
          </div>
          <div className="text-white text-3xl font-black font-data">{formatINR(totalAnnual)}</div>
          <div className="text-[#71717A] text-xs mt-2">{stats?.active_licences || 0} active subscriptions • Annual cost</div>
          <div className="mt-4 pt-4 border-t border-[#3F3F46]/50">
            <div className="flex justify-between text-xs">
              <span className="text-[#71717A]">Monthly:</span>
              <span className="text-white font-data">{formatINR(totalAnnual / 12)}</span>
            </div>
          </div>
        </div>
        
        {/* Asset Value Card */}
        <div className="bg-gradient-to-br from-[#F9982E]/20 to-[#1B1B1B] border border-[#F9982E]/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[#F9982E] text-xs uppercase tracking-wider font-medium">Purchased Assets</div>
            <FolderOpen size={20} className="text-[#F9982E]" />
          </div>
          <div className="text-white text-3xl font-black font-data">{formatINR(totalAssetValue)}</div>
          <div className="text-[#71717A] text-xs mt-2">{assets.length} asset packs • One-time purchases</div>
          <div className="mt-4 pt-4 border-t border-[#3F3F46]/50">
            <div className="flex justify-between text-xs">
              <span className="text-[#71717A]">Avg. per pack:</span>
              <span className="text-white font-data">{assets.length > 0 ? formatINR(totalAssetValue / assets.length) : '₹0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#27272A] border border-[#3F3F46] p-1 rounded-xl">
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#F9982E] data-[state=active]:text-black rounded-lg px-4 py-2 text-sm">
            <CreditCard size={14} className="mr-2" />
            Subscriptions ({licences.length})
          </TabsTrigger>
          <TabsTrigger value="assets" className="data-[state=active]:bg-[#F9982E] data-[state=active]:text-black rounded-lg px-4 py-2 text-sm">
            <FolderOpen size={14} className="mr-2" />
            Purchased Assets ({assets.length})
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              {categoryBreakdown.slice(0, 3).map(([category, amount]) => (
                <div key={category} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                  <span className="text-xs text-[#71717A]">{category}: {formatINR(amount)}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => setAddLicenceDialog(true)} className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black text-xs rounded-xl">
              <Plus size={14} className="mr-1" /> Add Subscription
            </Button>
          </div>

          {/* Expiring Soon Alert */}
          {stats?.expiring_soon?.length > 0 && (
            <div className="bg-orange-950/20 border border-orange-900/50 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-orange-400" />
              <span className="text-orange-400 text-sm">
                {stats.expiring_soon.length} subscription(s) expiring within 30 days
              </span>
            </div>
          )}

          {/* Licences Table */}
          <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl overflow-hidden">
            {licences.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard size={40} className="mx-auto text-[#52525B] mb-3" />
                <div className="text-white text-sm mb-1">No subscriptions yet</div>
                <div className="text-[#52525B] text-xs">Add your first subscription to start tracking</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#1B1B1B]">
                  <tr className="border-b border-[#3F3F46]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Credentials</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Cost</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Annual</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Renewal</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licences.map((licence) => (
                    <tr key={licence.id} className="border-b border-[#3F3F46]/50 hover:bg-[#1B1B1B]/50">
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{licence.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#52525B] text-xs">{licence.vendor}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${getCategoryColor(licence.category)}20`, color: getCategoryColor(licence.category) }}>
                            {licence.category}
                          </span>
                          {licence.seats && <span className="text-[#52525B] text-xs">{licence.seats} seats</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium" style={{ backgroundColor: `${getLicenceTypeColor(licence.licence_type)}20`, color: getLicenceTypeColor(licence.licence_type) }}>
                          {licence.licence_type || 'Annual'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {licence.account_email ? (
                          <div className="text-xs">
                            <div className="text-[#A1A1AA]">{licence.account_email}</div>
                            {licence.account_password && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[#52525B] font-mono">
                                  {visiblePasswords[licence.id] ? licence.account_password : '••••••••'}
                                </span>
                                <button onClick={() => togglePasswordVisibility(licence.id)} className="text-[#52525B] hover:text-white">
                                  {visiblePasswords[licence.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#52525B] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-data text-white text-xs">
                        {formatINR(licence.cost_per_period)}
                        <span className="text-[#52525B] ml-1">/{licence.billing_period?.slice(0, 3).toLowerCase()}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-data text-[#F9982E] font-bold text-xs">
                        {formatINR(calculateAnnualCost(licence.cost_per_period, licence.billing_period))}
                      </td>
                      <td className="py-3 px-4 text-center text-[#71717A] text-xs">
                        {licence.renewal_date ? new Date(licence.renewal_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg border ${getStatusBadge(licence.status)}`}>
                          {licence.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditLicence(licence)} className="p-1.5 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg">
                            <Pencil size={14} />
                          </button>
                          {canDeleteLicences && <button onClick={() => handleDeleteLicence(licence.id)} className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg">
                            <Trash2 size={14} />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddAssetDialog(true)} className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black text-xs rounded-xl">
              <Plus size={14} className="mr-1" /> Add Asset Pack
            </Button>
          </div>

          <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl overflow-hidden">
            {assets.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen size={40} className="mx-auto text-[#52525B] mb-3" />
                <div className="text-white text-sm mb-1">No assets yet</div>
                <div className="text-[#52525B] text-xs">Add purchased asset packs to track ownership and storage</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#1B1B1B]">
                  <tr className="border-b border-[#3F3F46]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Asset Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Platform</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Purchase Date</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Price</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Project</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Storage</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-[#71717A] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b border-[#3F3F46]/50 hover:bg-[#1B1B1B]/50">
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{asset.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${getCategoryColor(asset.category)}20`, color: getCategoryColor(asset.category) }}>
                            {asset.category}
                          </span>
                          {asset.licence_type && <span className="text-[#52525B] text-xs">{asset.licence_type}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA] text-xs">{asset.vendor}</td>
                      <td className="py-3 px-4 text-center text-[#71717A] text-xs">
                        {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-data text-white text-xs">
                        {asset.purchase_price ? formatINR(asset.purchase_price) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {asset.project_name ? (
                          <span className="bg-[#F9982E]/20 text-[#F9982E] px-2 py-0.5 rounded text-xs">{asset.project_name}</span>
                        ) : (
                          <span className="text-[#52525B] text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <HardDrive size={12} className="text-[#52525B]" />
                          <span className="text-[#A1A1AA] font-mono truncate max-w-[150px]" title={asset.storage_location}>
                            {asset.storage_location}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditAsset(asset)} className="p-1.5 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-lg">
                            <Pencil size={14} />
                          </button>
                          {canDeleteLicences && <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg">
                            <Trash2 size={14} />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Licence Dialog */}
      <Dialog open={addLicenceDialog} onOpenChange={setAddLicenceDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">ADD SUBSCRIPTION</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Name *</Label>
                <Input value={newLicenceForm.name} onChange={(e) => setNewLicenceForm({...newLicenceForm, name: e.target.value})} placeholder="Adobe CC" className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Vendor *</Label>
                <Input value={newLicenceForm.vendor} onChange={(e) => setNewLicenceForm({...newLicenceForm, vendor: e.target.value})} placeholder="Adobe" className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Category</Label>
                <Select value={newLicenceForm.category} onValueChange={(val) => setNewLicenceForm({...newLicenceForm, category: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Software', 'Hardware', 'Service', 'Cloud', 'Support', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Licence Type</Label>
                <Select value={newLicenceForm.licence_type} onValueChange={(val) => setNewLicenceForm({...newLicenceForm, licence_type: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Monthly', 'Annual', 'Lifetime'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Seats</Label>
                <Input type="number" value={newLicenceForm.seats} onChange={(e) => setNewLicenceForm({...newLicenceForm, seats: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Billing Period</Label>
                <Select value={newLicenceForm.billing_period} onValueChange={(val) => setNewLicenceForm({...newLicenceForm, billing_period: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Monthly', 'Quarterly', 'Yearly'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Cost (₹) *</Label>
                <Input type="number" value={newLicenceForm.cost_per_period} onChange={(e) => setNewLicenceForm({...newLicenceForm, cost_per_period: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Renewal Date</Label>
                <Input type="date" value={newLicenceForm.renewal_date} onChange={(e) => setNewLicenceForm({...newLicenceForm, renewal_date: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={newLicenceForm.status} onValueChange={(val) => setNewLicenceForm({...newLicenceForm, status: val})}>
                <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  {['Active', 'Expiring Soon', 'Expired', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-[#3F3F46] pt-3 mt-3">
              <Label className="text-xs text-[#71717A] mb-2 block">Account Credentials</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Email</Label>
                  <Input value={newLicenceForm.account_email} onChange={(e) => setNewLicenceForm({...newLicenceForm, account_email: e.target.value})} placeholder="account@email.com" className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Password</Label>
                  <Input type="password" value={newLicenceForm.account_password} onChange={(e) => setNewLicenceForm({...newLicenceForm, account_password: e.target.value})} placeholder="••••••••" className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={newLicenceForm.notes} onChange={(e) => setNewLicenceForm({...newLicenceForm, notes: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] min-h-[60px] text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAddLicenceDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-xl text-sm">Cancel</Button>
            <Button onClick={handleAddLicence} className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black rounded-xl text-sm">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Licence Dialog */}
      <Dialog open={editLicenceDialog} onOpenChange={setEditLicenceDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">EDIT SUBSCRIPTION</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Name *</Label>
                <Input value={editLicenceForm.name} onChange={(e) => setEditLicenceForm({...editLicenceForm, name: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Vendor *</Label>
                <Input value={editLicenceForm.vendor} onChange={(e) => setEditLicenceForm({...editLicenceForm, vendor: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Category</Label>
                <Select value={editLicenceForm.category} onValueChange={(val) => setEditLicenceForm({...editLicenceForm, category: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Software', 'Hardware', 'Service', 'Cloud', 'Support', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Licence Type</Label>
                <Select value={editLicenceForm.licence_type} onValueChange={(val) => setEditLicenceForm({...editLicenceForm, licence_type: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Monthly', 'Annual', 'Lifetime'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Seats</Label>
                <Input type="number" value={editLicenceForm.seats} onChange={(e) => setEditLicenceForm({...editLicenceForm, seats: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Billing Period</Label>
                <Select value={editLicenceForm.billing_period} onValueChange={(val) => setEditLicenceForm({...editLicenceForm, billing_period: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Monthly', 'Quarterly', 'Yearly'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Cost (₹) *</Label>
                <Input type="number" value={editLicenceForm.cost_per_period} onChange={(e) => setEditLicenceForm({...editLicenceForm, cost_per_period: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Renewal Date</Label>
                <Input type="date" value={editLicenceForm.renewal_date} onChange={(e) => setEditLicenceForm({...editLicenceForm, renewal_date: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={editLicenceForm.status} onValueChange={(val) => setEditLicenceForm({...editLicenceForm, status: val})}>
                <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  {['Active', 'Expiring Soon', 'Expired', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-[#3F3F46] pt-3 mt-3">
              <Label className="text-xs text-[#71717A] mb-2 block">Account Credentials</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Email</Label>
                  <Input value={editLicenceForm.account_email} onChange={(e) => setEditLicenceForm({...editLicenceForm, account_email: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Password</Label>
                  <Input type="password" value={editLicenceForm.account_password} onChange={(e) => setEditLicenceForm({...editLicenceForm, account_password: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={editLicenceForm.notes} onChange={(e) => setEditLicenceForm({...editLicenceForm, notes: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] min-h-[60px] text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditLicenceDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-xl text-sm">Cancel</Button>
            <Button onClick={handleUpdateLicence} className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white rounded-xl text-sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={addAssetDialog} onOpenChange={setAddAssetDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">ADD ASSET PACK</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Name *</Label>
                <Input value={newAssetForm.name} onChange={(e) => setNewAssetForm({...newAssetForm, name: e.target.value})} placeholder="Asset pack name" className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Platform/Vendor *</Label>
                <Input value={newAssetForm.vendor} onChange={(e) => setNewAssetForm({...newAssetForm, vendor: e.target.value})} placeholder="Envato, Adobe Stock" className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Category</Label>
                <Select value={newAssetForm.category} onValueChange={(val) => setNewAssetForm({...newAssetForm, category: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Stock Footage', '3D Models', 'Sound Effects', 'Music', 'Templates', 'Plugins', 'Environments', 'Motion Capture', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Licence Type</Label>
                <Select value={newAssetForm.licence_type} onValueChange={(val) => setNewAssetForm({...newAssetForm, licence_type: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Royalty-free', 'Editorial', 'Extended', 'Single-use', 'Other'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Purchase Date</Label>
                <Input type="date" value={newAssetForm.purchase_date} onChange={(e) => setNewAssetForm({...newAssetForm, purchase_date: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Price (₹)</Label>
                <Input type="number" value={newAssetForm.purchase_price} onChange={(e) => setNewAssetForm({...newAssetForm, purchase_price: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Assigned Project</Label>
              <Select value={newAssetForm.project_id} onValueChange={(val) => setNewAssetForm({...newAssetForm, project_id: val === 'none' ? '' : val})}>
                <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="none">None</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Storage Location *</Label>
              <Input value={newAssetForm.storage_location} onChange={(e) => setNewAssetForm({...newAssetForm, storage_location: e.target.value})} placeholder="//NAS/Assets/Footage or /local/assets" className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={newAssetForm.notes} onChange={(e) => setNewAssetForm({...newAssetForm, notes: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] min-h-[60px] text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAddAssetDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-xl text-sm">Cancel</Button>
            <Button onClick={handleAddAsset} className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black rounded-xl text-sm">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={editAssetDialog} onOpenChange={setEditAssetDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">EDIT ASSET</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Name *</Label>
                <Input value={editAssetForm.name} onChange={(e) => setEditAssetForm({...editAssetForm, name: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Platform/Vendor *</Label>
                <Input value={editAssetForm.vendor} onChange={(e) => setEditAssetForm({...editAssetForm, vendor: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Category</Label>
                <Select value={editAssetForm.category} onValueChange={(val) => setEditAssetForm({...editAssetForm, category: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Stock Footage', '3D Models', 'Sound Effects', 'Music', 'Templates', 'Plugins', 'Environments', 'Motion Capture', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Licence Type</Label>
                <Select value={editAssetForm.licence_type} onValueChange={(val) => setEditAssetForm({...editAssetForm, licence_type: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {['Royalty-free', 'Editorial', 'Extended', 'Single-use', 'Other'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Purchase Date</Label>
                <Input type="date" value={editAssetForm.purchase_date} onChange={(e) => setEditAssetForm({...editAssetForm, purchase_date: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Price (₹)</Label>
                <Input type="number" value={editAssetForm.purchase_price} onChange={(e) => setEditAssetForm({...editAssetForm, purchase_price: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Assigned Project</Label>
              <Select value={editAssetForm.project_id || 'none'} onValueChange={(val) => setEditAssetForm({...editAssetForm, project_id: val === 'none' ? '' : val})}>
                <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="none">None</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Storage Location *</Label>
              <Input value={editAssetForm.storage_location} onChange={(e) => setEditAssetForm({...editAssetForm, storage_location: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-9 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={editAssetForm.notes} onChange={(e) => setEditAssetForm({...editAssetForm, notes: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] min-h-[60px] text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditAssetDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-xl text-sm">Cancel</Button>
            <Button onClick={handleUpdateAsset} className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white rounded-xl text-sm">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
