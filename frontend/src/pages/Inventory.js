import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Plus, Package, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categoryIcons = {
  'Camera & Optics': 'C',
  'Lighting': 'L',
  'Audio': 'A',
  'Video & Capture': 'V',
  'Computing': 'PC',
  'Displays': 'D',
  'Storage & Media': 'S',
  'Networking': 'N',
  'Power & Cables': 'P',
  'Hardware & Tools': 'H',
  'Tracking': 'T',
  'Chroma Mat': 'CM',
};

const categoryColors = {
  'Camera & Optics': '#F9982E',
  'Lighting': '#FACC15',
  'Audio': '#A78BFA',
  'Video & Capture': '#3B82F6',
  'Computing': '#10B981',
  'Displays': '#06B6D4',
  'Storage & Media': '#F472B6',
  'Networking': '#6366F1',
  'Power & Cables': '#EF4444',
  'Hardware & Tools': '#71717A',
  'Tracking': '#14B8A6',
  'Chroma Mat': '#22C55E',
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCheckoutFilter, setSelectedCheckoutFilter] = useState('all');
  const [markOutDialog, setMarkOutDialog] = useState(false);
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [markOutForm, setMarkOutForm] = useState({ project_id: '', quantity: 1, expected_return: '', notes: '' });
  const [newItemForm, setNewItemForm] = useState({ name: '', category: '', sub_category: '', total_quantity: 1, location_in_studio: '', min_stock: null, product_id: '', serial_number: '', purchase_date: '', expiry_date: '', warranty_expiry: '', vendor: '', purchase_price: '', notes: '' });

  useEffect(() => { fetchItems(); fetchProjects(); }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/items`);
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
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

  const categories = useMemo(() => {
    const catMap = {};
    items.forEach(item => {
      if (!catMap[item.category]) catMap[item.category] = { count: 0, totalQty: 0 };
      catMap[item.category].count += 1;
      catMap[item.category].totalQty += item.total_quantity;
    });
    return Object.entries(catMap).sort((a, b) => b[1].count - a[1].count);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sub_category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      let matchesCheckout = true;
      if (selectedCheckoutFilter === 'out') matchesCheckout = item.quantity_out > 0;
      else if (selectedCheckoutFilter === 'in') matchesCheckout = item.quantity_out === 0;
      return matchesSearch && matchesCategory && matchesStatus && matchesCheckout;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus, selectedCheckoutFilter]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredItems]);

  const openMarkOut = (item) => {
    setSelectedItem(item);
    setMarkOutForm({ project_id: '', quantity: 1, expected_return: '', notes: '' });
    setMarkOutDialog(true);
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    let expectedReturn = '';
    if (project?.end_date) expectedReturn = `${project.end_date}T18:00`;
    setMarkOutForm({ ...markOutForm, project_id: projectId, expected_return: expectedReturn });
  };

  const handleMarkOut = async () => {
    if (!markOutForm.project_id || !markOutForm.expected_return || markOutForm.quantity < 1) {
      toast.error('Please fill all required fields');
      return;
    }
    if (markOutForm.quantity > selectedItem.quantity_available) {
      toast.error('Quantity exceeds available stock');
      return;
    }
    try {
      await axios.post(`${API}/checkouts/mark-out`, { item_id: selectedItem.id, ...markOutForm });
      toast.success(`${selectedItem.name} marked out successfully`);
      setMarkOutDialog(false);
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark out item');
    }
  };

  const handleAddItem = async () => {
    if (!newItemForm.name || !newItemForm.category || newItemForm.total_quantity < 1) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const payload = { ...newItemForm };
      if (payload.purchase_price) payload.purchase_price = parseFloat(payload.purchase_price);
      else delete payload.purchase_price;
      if (!payload.sub_category) delete payload.sub_category;
      if (!payload.product_id) delete payload.product_id;
      if (!payload.serial_number) delete payload.serial_number;
      if (!payload.purchase_date) delete payload.purchase_date;
      if (!payload.expiry_date) delete payload.expiry_date;
      if (!payload.warranty_expiry) delete payload.warranty_expiry;
      if (!payload.vendor) delete payload.vendor;
      if (!payload.notes) delete payload.notes;
      if (!payload.location_in_studio) delete payload.location_in_studio;
      delete payload.min_stock;

      await axios.post(`${API}/items`, payload);
      toast.success('Item added successfully');
      setAddItemDialog(false);
      setNewItemForm({ name: '', category: '', sub_category: '', total_quantity: 1, location_in_studio: '', min_stock: null, product_id: '', serial_number: '', purchase_date: '', expiry_date: '', warranty_expiry: '', vendor: '', purchase_price: '', notes: '' });
      fetchItems();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Available': 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
      'Under Maintenance': 'bg-blue-950/40 text-blue-400 border-blue-900/50',
      'Reserved': 'bg-orange-950/40 text-orange-400 border-orange-900/50',
      'Lost': 'bg-red-950/40 text-red-400 border-red-900/50'
    };
    return badges[status] || 'bg-[#232328] text-[#71717A] border-[#232328]';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#52525B] font-data text-sm">LOADING INVENTORY...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight" data-testid="inventory-title">
            INVENTORY
          </h1>
          <p className="text-[#52525B] mt-1 text-sm">{filteredItems.length} of {items.length} items</p>
        </div>
        <Button
          onClick={() => setAddItemDialog(true)}
          data-testid="add-item-button"
          className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg text-xs"
        >
          <Plus size={16} className="mr-1.5" />
          Add Item
        </Button>
      </div>

      <div className="flex gap-5">
        {/* Category Sidebar */}
        <div className="w-56 shrink-0 hidden lg:block" data-testid="category-sidebar">
          <div className="sticky top-24 space-y-1">
            <button
              onClick={() => setSelectedCategory('all')}
              data-testid="cat-all"
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                selectedCategory === 'all'
                  ? 'bg-[#F9982E]/10 text-[#F9982E] border border-[#F9982E]/30'
                  : 'text-[#71717A] hover:text-white hover:bg-[#18181B]'
              }`}
            >
              <span>All Categories</span>
              <span className="font-data text-[10px]">{items.length}</span>
            </button>
            {categories.map(([cat, data]) => {
              const color = categoryColors[cat] || '#71717A';
              const icon = categoryIcons[cat] || cat[0];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                  data-testid={`cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                    selectedCategory === cat
                      ? 'bg-[#18181B] text-white border border-[#232328]'
                      : 'text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#18181B]/50'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ backgroundColor: color + '20', color: color }}
                  >
                    {icon}
                  </span>
                  <span className="truncate flex-1">{cat}</span>
                  <span className="font-data text-[10px] text-[#3F3F46]">{data.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3F3F46]" size={16} />
              <Input
                placeholder="Search items, categories, sub-categories..."
                data-testid="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-[#18181B] border-[#232328] focus:border-[#F9982E] text-white h-10 text-sm"
              />
            </div>
            {/* Mobile category dropdown */}
            <div className="lg:hidden">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="category-filter" className="bg-[#18181B] border-[#232328] text-white h-10 w-40 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#232328]">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(([cat]) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid="status-filter" className="bg-[#18181B] border-[#232328] text-white h-10 w-36 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#232328]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Under Maintenance">Maintenance</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCheckoutFilter} onValueChange={setSelectedCheckoutFilter}>
              <SelectTrigger data-testid="checkout-filter" className="bg-[#18181B] border-[#232328] text-white h-10 w-36 text-xs">
                <SelectValue placeholder="Checkout" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#232328]">
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="out">Checked Out</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Grouped View */}
          {selectedCategory === 'all' ? (
            <div className="space-y-4">
              {groupedItems.map(([cat, catItems]) => {
                const color = categoryColors[cat] || '#71717A';
                return (
                  <div key={cat} data-testid={`group-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">{cat}</span>
                      <span className="text-[10px] text-[#3F3F46] font-data">{catItems.length} items</span>
                    </div>
                    {/* Items Table */}
                    <div className="bg-[#18181B] border border-[#232328] rounded-lg overflow-hidden">
                      <table className="w-full" data-testid="inventory-table">
                        <tbody>
                          {catItems.map((item) => (
                            <tr
                              key={item.id}
                              data-testid={`item-row-${item.id}`}
                              className="border-b border-[#232328] last:border-b-0 hover:bg-[#1C1C1F] transition-colors"
                            >
                              <td className="py-3 px-4 w-[45%]">
                                <div className="text-white text-sm font-medium">{item.name}</div>
                                {item.sub_category && (
                                  <div className="text-[10px] text-[#3F3F46] mt-0.5">{item.sub_category}</div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center w-16">
                                <div className="font-data text-sm text-white font-bold">{item.quantity_available}</div>
                                <div className="text-[9px] text-[#3F3F46] uppercase">Avail</div>
                              </td>
                              <td className="py-3 px-3 text-center w-16">
                                <div className={`font-data text-sm font-bold ${item.quantity_out > 0 ? 'text-[#F9982E]' : 'text-[#232328]'}`}>
                                  {item.quantity_out}
                                </div>
                                <div className="text-[9px] text-[#3F3F46] uppercase">Out</div>
                              </td>
                              <td className="py-3 px-3 text-center w-16">
                                <div className="font-data text-sm text-[#52525B]">{item.total_quantity}</div>
                                <div className="text-[9px] text-[#3F3F46] uppercase">Total</div>
                              </td>
                              <td className="py-3 px-3 text-center w-24">
                                <span className={`font-data text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(item.status)}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right w-24">
                                <button
                                  onClick={() => openMarkOut(item)}
                                  data-testid={`mark-out-${item.id}`}
                                  disabled={item.quantity_available === 0 || item.status !== 'Available'}
                                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                    item.quantity_out > 0
                                      ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
                                      : 'bg-[#F9982E] hover:bg-[#F9982E]/90 text-black'
                                  }`}
                                >
                                  {item.quantity_out > 0 ? 'Add' : 'Out'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single Category View */
            <div className="bg-[#18181B] border border-[#232328] rounded-lg overflow-hidden">
              <table className="w-full" data-testid="inventory-table">
                <thead>
                  <tr className="border-b border-[#232328]">
                    <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Item Name</th>
                    <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Sub-Category</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Avail</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Out</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Total</th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Status</th>
                    <th className="text-right py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} data-testid={`item-row-${item.id}`} className="border-b border-[#232328] last:border-b-0 hover:bg-[#1C1C1F] transition-colors">
                      <td className="py-3 px-4 text-white text-sm font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-[#52525B] text-xs">{item.sub_category || '—'}</td>
                      <td className="py-3 px-3 text-center font-data text-sm text-white font-bold">{item.quantity_available}</td>
                      <td className="py-3 px-3 text-center font-data text-sm font-bold">
                        <span className={item.quantity_out > 0 ? 'text-[#F9982E]' : 'text-[#232328]'}>{item.quantity_out}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-data text-sm text-[#52525B]">{item.total_quantity}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-data text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openMarkOut(item)}
                          data-testid={`mark-out-${item.id}`}
                          disabled={item.quantity_available === 0 || item.status !== 'Available'}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                            item.quantity_out > 0
                              ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
                              : 'bg-[#F9982E] hover:bg-[#F9982E]/90 text-black'
                          }`}
                        >
                          {item.quantity_out > 0 ? 'Add More' : 'Mark Out'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="bg-[#18181B] border border-[#232328] rounded-lg p-12 text-center">
              <Package size={32} className="text-[#232328] mx-auto mb-3" />
              <p className="text-[#3F3F46] text-sm">No items match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mark Out Dialog */}
      <Dialog open={markOutDialog} onOpenChange={setMarkOutDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-md" data-testid="mark-out-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              MARK OUT: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#52525B] text-xs mb-1 block">Available: <span className="text-white font-data font-bold">{selectedItem?.quantity_available}</span></Label>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Project / Shoot *</Label>
              <Select value={markOutForm.project_id} onValueChange={handleProjectChange}>
                <SelectTrigger data-testid="project-select" className="bg-[#0F0F0F] border-[#232328] text-white h-11">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#232328]">
                  {projects.map(proj => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                      {proj.end_date && <span className="text-[#52525B] ml-2 text-xs">ends {new Date(proj.end_date).toLocaleDateString()}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Quantity *</Label>
              <Input
                type="number"
                data-testid="quantity-input"
                min="1"
                max={selectedItem?.quantity_available}
                value={markOutForm.quantity}
                onChange={(e) => setMarkOutForm({ ...markOutForm, quantity: parseInt(e.target.value) || 1 })}
                className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">
                Expected Return *
                {markOutForm.project_id && projects.find(p => p.id === markOutForm.project_id)?.end_date && (
                  <span className="text-[#F9982E] text-xs ml-2">(from project)</span>
                )}
              </Label>
              <Input
                type="datetime-local"
                data-testid="return-date-input"
                value={markOutForm.expected_return}
                onChange={(e) => setMarkOutForm({ ...markOutForm, expected_return: e.target.value })}
                className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Notes</Label>
              <Input
                data-testid="notes-input"
                value={markOutForm.notes}
                onChange={(e) => setMarkOutForm({ ...markOutForm, notes: e.target.value })}
                className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11"
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setMarkOutDialog(false)} data-testid="cancel-mark-out" className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleMarkOut} data-testid="confirm-mark-out" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">
              Confirm Mark Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialog} onOpenChange={setAddItemDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-lg max-h-[85vh] overflow-y-auto" data-testid="add-item-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">ADD NEW ITEM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Required Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-white text-sm mb-2 block">Item Name *</Label>
                <Input data-testid="item-name-input" value={newItemForm.name} onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Category *</Label>
                <Select value={newItemForm.category} onValueChange={(v) => setNewItemForm({ ...newItemForm, category: v })}>
                  <SelectTrigger data-testid="item-category-input" className="bg-[#0F0F0F] border-[#232328] text-white h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">
                    {categories.map(([cat]) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Sub-Category</Label>
                <Input data-testid="item-subcategory-input" value={newItemForm.sub_category} onChange={(e) => setNewItemForm({ ...newItemForm, sub_category: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. Lenses, Lights" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Total Quantity *</Label>
                <Input type="number" data-testid="item-quantity-input" min="1" value={newItemForm.total_quantity} onChange={(e) => setNewItemForm({ ...newItemForm, total_quantity: parseInt(e.target.value) || 1 })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Location in Studio</Label>
                <Input data-testid="item-location-input" value={newItemForm.location_in_studio} onChange={(e) => setNewItemForm({ ...newItemForm, location_in_studio: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. Shelf A3" />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-[#232328]" />
              <span className="text-[10px] text-[#3F3F46] uppercase tracking-widest">Product Details</span>
              <div className="h-px flex-1 bg-[#232328]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white text-sm mb-2 block">Product ID / SKU</Label>
                <Input data-testid="item-product-id-input" value={newItemForm.product_id} onChange={(e) => setNewItemForm({ ...newItemForm, product_id: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. BMD-6KG2-001" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Serial Number</Label>
                <Input data-testid="item-serial-input" value={newItemForm.serial_number} onChange={(e) => setNewItemForm({ ...newItemForm, serial_number: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. SN-123456" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Vendor / Supplier</Label>
                <Input data-testid="item-vendor-input" value={newItemForm.vendor} onChange={(e) => setNewItemForm({ ...newItemForm, vendor: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. B&H Photo" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Purchase Price</Label>
                <Input type="number" step="0.01" data-testid="item-price-input" value={newItemForm.purchase_price} onChange={(e) => setNewItemForm({ ...newItemForm, purchase_price: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="0.00" />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-[#232328]" />
              <span className="text-[10px] text-[#3F3F46] uppercase tracking-widest">Dates</span>
              <div className="h-px flex-1 bg-[#232328]" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-white text-sm mb-2 block">Purchase Date</Label>
                <Input type="date" data-testid="item-purchase-date-input" value={newItemForm.purchase_date} onChange={(e) => setNewItemForm({ ...newItemForm, purchase_date: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Expiry Date</Label>
                <Input type="date" data-testid="item-expiry-date-input" value={newItemForm.expiry_date} onChange={(e) => setNewItemForm({ ...newItemForm, expiry_date: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Warranty Expiry</Label>
                <Input type="date" data-testid="item-warranty-input" value={newItemForm.warranty_expiry} onChange={(e) => setNewItemForm({ ...newItemForm, warranty_expiry: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-white text-sm mb-2 block">Notes</Label>
              <Input data-testid="item-notes-input" value={newItemForm.notes} onChange={(e) => setNewItemForm({ ...newItemForm, notes: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="Any additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAddItemDialog(false)} data-testid="cancel-add-item" className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleAddItem} data-testid="confirm-add-item" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
