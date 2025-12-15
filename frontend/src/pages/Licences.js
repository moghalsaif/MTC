import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, CreditCard, Trash2, Pencil, AlertTriangle, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Licences() {
  const [licences, setLicences] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addLicenceDialog, setAddLicenceDialog] = useState(false);
  const [editLicenceDialog, setEditLicenceDialog] = useState(false);
  const [editingLicence, setEditingLicence] = useState(null);
  const [newLicenceForm, setNewLicenceForm] = useState({
    name: '',
    vendor: '',
    category: 'Software',
    cost_per_period: '',
    billing_period: 'Monthly',
    renewal_date: '',
    status: 'Active',
    seats: '',
    notes: ''
  });
  const [editLicenceForm, setEditLicenceForm] = useState({
    name: '',
    vendor: '',
    category: 'Software',
    cost_per_period: '',
    billing_period: 'Monthly',
    renewal_date: '',
    status: 'Active',
    seats: '',
    notes: ''
  });

  useEffect(() => {
    fetchLicences();
    fetchStats();
  }, []);

  const fetchLicences = async () => {
    try {
      const response = await axios.get(`${API}/licences`);
      setLicences(response.data);
    } catch (error) {
      console.error('Failed to fetch licences:', error);
      toast.error('Failed to load licences');
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
      toast.success('Licence added successfully');
      setAddLicenceDialog(false);
      setNewLicenceForm({
        name: '',
        vendor: '',
        category: 'Software',
        cost_per_period: '',
        billing_period: 'Monthly',
        renewal_date: '',
        status: 'Active',
        seats: '',
        notes: ''
      });
      fetchLicences();
      fetchStats();
    } catch (error) {
      console.error('Failed to add licence:', error);
      toast.error('Failed to add licence');
    }
  };

  const openEditLicence = (licence) => {
    setEditingLicence(licence);
    setEditLicenceForm({
      name: licence.name || '',
      vendor: licence.vendor || '',
      category: licence.category || 'Software',
      cost_per_period: licence.cost_per_period?.toString() || '',
      billing_period: licence.billing_period || 'Monthly',
      renewal_date: licence.renewal_date ? licence.renewal_date.split('T')[0] : '',
      status: licence.status || 'Active',
      seats: licence.seats?.toString() || '',
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
      toast.success('Licence updated successfully');
      setEditLicenceDialog(false);
      setEditingLicence(null);
      fetchLicences();
      fetchStats();
    } catch (error) {
      console.error('Failed to update licence:', error);
      toast.error('Failed to update licence');
    }
  };

  const handleDeleteLicence = async (licenceId) => {
    if (!window.confirm('Are you sure you want to delete this licence?')) {
      return;
    }

    try {
      await axios.delete(`${API}/licences/${licenceId}`);
      toast.success('Licence deleted successfully');
      fetchLicences();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete licence:', error);
      toast.error('Failed to delete licence');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Active': 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
      'Expiring Soon': 'bg-orange-950/30 text-orange-400 border-orange-900',
      'Expired': 'bg-red-950/30 text-red-400 border-red-900',
      'Cancelled': 'bg-[#3F3F46] text-[#A1A1AA] border-[#3F3F46]'
    };
    return badges[status] || 'bg-[#3F3F46] text-white border-[#3F3F46]';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Software': '#8B5CF6',
      'Hardware': '#F59E0B',
      'Service': '#10B981',
      'Cloud': '#3B82F6',
      'Support': '#EC4899',
      'Other': '#71717A'
    };
    return colors[category] || colors['Other'];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
        <div className="text-white font-data">LOADING LICENCES...</div>
      </div>
    );
  }

  // Calculate category breakdown for visual chart
  const categoryBreakdown = stats?.by_category ? Object.entries(stats.by_category).sort((a, b) => b[1] - a[1]) : [];
  const totalAnnual = stats?.total_annual_spend || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="licences-title">
            LICENCES
          </h1>
          <p className="text-[#A1A1AA] mt-2">Subscription & licence management</p>
        </div>
        <Button
          onClick={() => setAddLicenceDialog(true)}
          data-testid="add-licence-button"
          className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
        >
          <Plus size={18} className="mr-2" />
          Add Licence
        </Button>
      </div>

      {/* Total Annual Spend Card */}
      <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-[#F9982E]/20 border border-[#3F3F46] rounded-3xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[#A1A1AA] text-sm uppercase tracking-wider mb-2">Total Annual Spend</div>
            <div className="text-white text-5xl font-black font-data">{formatCurrency(totalAnnual)}</div>
            <div className="text-[#71717A] text-sm mt-2">{stats?.active_licences || 0} active licences</div>
          </div>
          <div className="hidden md:block">
            <TrendingUp size={64} className="text-[#8B5CF6] opacity-50" />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category Breakdown */}
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6 md:col-span-2">
          <div className="text-[#A1A1AA] text-sm uppercase tracking-wider mb-4">Expenditure by Category</div>
          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {categoryBreakdown.map(([category, amount]) => {
                const percentage = totalAnnual > 0 ? (amount / totalAnnual) * 100 : 0;
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{category}</span>
                      <span className="text-white font-data font-bold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 bg-[#1B1B1B] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(category)
                        }}
                      />
                    </div>
                    <div className="text-[#71717A] text-xs mt-1">{percentage.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[#71717A] text-center py-8">No data yet</div>
          )}
        </div>

        {/* Expiring Soon */}
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle size={16} className="text-orange-400" />
            <div className="text-[#A1A1AA] text-sm uppercase tracking-wider">Expiring Soon</div>
          </div>
          {stats?.expiring_soon?.length > 0 ? (
            <div className="space-y-3">
              {stats.expiring_soon.map((licence) => (
                <div key={licence.id} className="bg-orange-950/20 border border-orange-900/50 rounded-xl p-3">
                  <div className="text-white font-medium text-sm">{licence.name}</div>
                  <div className="text-orange-400 text-xs mt-1">
                    {licence.days_until} days left
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#71717A] text-center py-4 text-sm">No renewals in next 30 days</div>
          )}
        </div>
      </div>

      {/* Licences Table */}
      <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6">
        <div className="text-[#A1A1AA] text-sm uppercase tracking-wider mb-4">All Licences</div>
        
        {licences.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard size={48} className="mx-auto text-[#71717A] mb-4" />
            <div className="text-white text-lg font-medium mb-2">No licences yet</div>
            <div className="text-[#A1A1AA]">Add your first licence to start tracking subscriptions</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="licences-table">
              <thead>
                <tr className="border-b border-[#3F3F46]">
                  <th className="text-left py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Vendor</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Category</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Cost</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Annual</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Renewal</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {licences.map((licence) => (
                  <tr key={licence.id} data-testid={`licence-row-${licence.id}`} className="border-b border-[#3F3F46] hover:bg-[#1B1B1B] transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-white font-medium">{licence.name}</div>
                      {licence.seats && <div className="text-[#71717A] text-xs">{licence.seats} seats</div>}
                    </td>
                    <td className="py-4 px-4 text-[#A1A1AA]">{licence.vendor}</td>
                    <td className="py-4 px-4">
                      <span 
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getCategoryColor(licence.category)}20`,
                          color: getCategoryColor(licence.category)
                        }}
                      >
                        {licence.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-data text-white">
                      {formatCurrency(licence.cost_per_period)}
                      <span className="text-[#71717A] text-xs ml-1">/{licence.billing_period?.toLowerCase().slice(0, 3)}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-data text-[#F9982E] font-bold">
                      {formatCurrency(calculateAnnualCost(licence.cost_per_period, licence.billing_period))}
                    </td>
                    <td className="py-4 px-4 text-center text-[#A1A1AA] text-sm">
                      {licence.renewal_date ? new Date(licence.renewal_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-2xl border ${getStatusBadge(licence.status)}`}>
                        {licence.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditLicence(licence)}
                          data-testid={`edit-licence-${licence.id}`}
                          className="p-2 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 rounded-xl transition-colors"
                          title="Edit licence"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteLicence(licence.id)}
                          data-testid={`delete-licence-${licence.id}`}
                          className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xl transition-colors"
                          title="Delete licence"
                        >
                          <Trash2 size={16} />
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

      {/* Add Licence Dialog */}
      <Dialog open={addLicenceDialog} onOpenChange={setAddLicenceDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="add-licence-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">ADD LICENCE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-white text-sm mb-2 block">Name *</Label>
              <Input
                data-testid="licence-name-input"
                value={newLicenceForm.name}
                onChange={(e) => setNewLicenceForm({...newLicenceForm, name: e.target.value})}
                placeholder="Adobe Creative Cloud"
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Vendor *</Label>
              <Input
                data-testid="licence-vendor-input"
                value={newLicenceForm.vendor}
                onChange={(e) => setNewLicenceForm({...newLicenceForm, vendor: e.target.value})}
                placeholder="Adobe"
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm mb-2 block">Category</Label>
                <Select value={newLicenceForm.category} onValueChange={(val) => setNewLicenceForm({...newLicenceForm, category: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Cloud">Cloud</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Seats</Label>
                <Input
                  type="number"
                  data-testid="licence-seats-input"
                  value={newLicenceForm.seats}
                  onChange={(e) => setNewLicenceForm({...newLicenceForm, seats: e.target.value})}
                  placeholder="Optional"
                  className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm mb-2 block">Cost *</Label>
                <Input
                  type="number"
                  step="0.01"
                  data-testid="licence-cost-input"
                  value={newLicenceForm.cost_per_period}
                  onChange={(e) => setNewLicenceForm({...newLicenceForm, cost_per_period: e.target.value})}
                  placeholder="99.99"
                  className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Billing Period</Label>
                <Select value={newLicenceForm.billing_period} onValueChange={(val) => setNewLicenceForm({...newLicenceForm, billing_period: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm mb-2 block">Renewal Date</Label>
                <Input
                  type="date"
                  data-testid="licence-renewal-input"
                  value={newLicenceForm.renewal_date}
                  onChange={(e) => setNewLicenceForm({...newLicenceForm, renewal_date: e.target.value})}
                  className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Status</Label>
                <Select value={newLicenceForm.status} onValueChange={(val) => setNewLicenceForm({...newLicenceForm, status: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Notes</Label>
              <Textarea
                data-testid="licence-notes-input"
                value={newLicenceForm.notes}
                onChange={(e) => setNewLicenceForm({...newLicenceForm, notes: e.target.value})}
                placeholder="Optional notes..."
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setAddLicenceDialog(false)}
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLicence}
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
            >
              Add Licence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Licence Dialog */}
      <Dialog open={editLicenceDialog} onOpenChange={setEditLicenceDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="edit-licence-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">EDIT LICENCE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-white text-sm mb-2 block">Name *</Label>
              <Input
                value={editLicenceForm.name}
                onChange={(e) => setEditLicenceForm({...editLicenceForm, name: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Vendor *</Label>
              <Input
                value={editLicenceForm.vendor}
                onChange={(e) => setEditLicenceForm({...editLicenceForm, vendor: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm mb-2 block">Category</Label>
                <Select value={editLicenceForm.category} onValueChange={(val) => setEditLicenceForm({...editLicenceForm, category: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Cloud">Cloud</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Seats</Label>
                <Input
                  type="number"
                  value={editLicenceForm.seats}
                  onChange={(e) => setEditLicenceForm({...editLicenceForm, seats: e.target.value})}
                  className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm mb-2 block">Cost *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editLicenceForm.cost_per_period}
                  onChange={(e) => setEditLicenceForm({...editLicenceForm, cost_per_period: e.target.value})}
                  className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Billing Period</Label>
                <Select value={editLicenceForm.billing_period} onValueChange={(val) => setEditLicenceForm({...editLicenceForm, billing_period: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm mb-2 block">Renewal Date</Label>
                <Input
                  type="date"
                  value={editLicenceForm.renewal_date}
                  onChange={(e) => setEditLicenceForm({...editLicenceForm, renewal_date: e.target.value})}
                  className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Status</Label>
                <Select value={editLicenceForm.status} onValueChange={(val) => setEditLicenceForm({...editLicenceForm, status: val})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Notes</Label>
              <Textarea
                value={editLicenceForm.notes}
                onChange={(e) => setEditLicenceForm({...editLicenceForm, notes: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setEditLicenceDialog(false)}
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLicence}
              className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase tracking-wider rounded-2xl"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
