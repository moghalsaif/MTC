import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categoryIcons = {
  'Camera & Optics': 'C', 'Lighting': 'L', 'Audio': 'A', 'Video & Capture': 'V',
  'Computing': 'PC', 'Displays': 'D', 'Storage & Media': 'S', 'Networking': 'N',
  'Power & Cables': 'P', 'Hardware & Tools': 'H', 'Tracking': 'T', 'Chroma Mat': 'CM',
};

const categoryColors = {
  'Camera & Optics': '#F9982E', 'Lighting': '#FACC15', 'Audio': '#A78BFA', 'Video & Capture': '#3B82F6',
  'Computing': '#10B981', 'Displays': '#06B6D4', 'Storage & Media': '#F472B6', 'Networking': '#6366F1',
  'Power & Cables': '#EF4444', 'Hardware & Tools': '#71717A', 'Tracking': '#14B8A6', 'Chroma Mat': '#22C55E',
};

export default function Inventory() {
  const { canManageInventory, canDeleteInventory } = useAuth();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCheckoutFilter, setSelectedCheckoutFilter] = useState('all');
  const [markOutDialog, setMarkOutDialog] = useState(false);
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [markOutForm, setMarkOutForm] = useState({ project_id: '', quantity: 1, expected_return: '', notes: '' });
  const [newItemForm, setNewItemForm] = useState({ name: '', category: '', sub_category: '', total_quantity: 1, location: '', product_id: '', serial_number: '', purchase_date: '', expiry_date: '', warranty_expiry: '', vendor: '', purchase_price: '', notes: '' });
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchItems(); fetchProjects(); }, []);

  const fetchItems = async () => {
    try { setItems((await axios.get(`${API}/items`)).data); }
    catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  const fetchProjects = async () => {
    try { setProjects((await axios.get(`${API}/projects`)).data); }
    catch { console.error('Failed to fetch projects'); }
  };

  const categories = useMemo(() => {
    const m = {};
    items.forEach(i => { if (!m[i.category]) m[i.category] = { count: 0 }; m[i.category].count++; });
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count);
  }, [items]);

  const filteredItems = useMemo(() => items.filter(item => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || item.name.toLowerCase().includes(s) || item.category.toLowerCase().includes(s) || (item.sub_category || '').toLowerCase().includes(s);
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;
    let matchCO = true;
    if (selectedCheckoutFilter === 'out') matchCO = item.quantity_out > 0;
    else if (selectedCheckoutFilter === 'in') matchCO = item.quantity_out === 0;
    return matchSearch && matchCat && matchStatus && matchCO;
  }), [items, searchTerm, selectedCategory, selectedStatus, selectedCheckoutFilter]);

  const groupedItems = useMemo(() => {
    const g = {};
    filteredItems.forEach(i => { if (!g[i.category]) g[i.category] = []; g[i.category].push(i); });
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredItems]);

  const openMarkOut = (item) => { setSelectedItem(item); setMarkOutForm({ project_id: '', quantity: 1, expected_return: '', notes: '' }); setMarkOutDialog(true); };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This will also remove all related checkouts, issues, and maintenance records.`)) return;
    try {
      const { data } = await axios.delete(`${API}/items/${item.id}`);
      toast.success(`Deleted "${item.name}"`);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete item');
    }
  };

  const openEdit = (item) => {
    setEditForm({
      name: item.name || '', category: item.category || '', sub_category: item.sub_category || '',
      total_quantity: item.total_quantity, location: item.location || '',
      product_id: item.product_id || '', serial_number: item.serial_number || '',
      purchase_date: item.purchase_date || '', expiry_date: item.expiry_date || '',
      warranty_expiry: item.warranty_expiry || '', vendor: item.vendor || '',
      purchase_price: item.purchase_price || '', notes: item.notes || '', status: item.status || 'Available', condition: item.condition || 'OK'
    });
    setSelectedItem(item);
    setEditItemDialog(true);
  };

  const handleProjectChange = (pid) => {
    const p = projects.find(x => x.id === pid);
    let er = '';
    if (p?.end_date) er = `${p.end_date}T18:00`;
    setMarkOutForm({ ...markOutForm, project_id: pid, expected_return: er });
  };

  const handleMarkOut = async () => {
    if (!markOutForm.project_id || !markOutForm.expected_return || markOutForm.quantity < 1) { toast.error('Please fill all required fields'); return; }
    if (markOutForm.quantity > selectedItem.quantity_available) { toast.error('Quantity exceeds available stock'); return; }
    try {
      await axios.post(`${API}/checkouts/mark-out`, { item_id: selectedItem.id, ...markOutForm });
      toast.success(`${selectedItem.name} marked out`);
      setMarkOutDialog(false); fetchItems();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to mark out'); }
  };

  const handleAddItem = async () => {
    if (!newItemForm.name || !newItemForm.category || newItemForm.total_quantity < 1) { toast.error('Please fill required fields'); return; }
    try {
      const p = { ...newItemForm };
      if (p.purchase_price) p.purchase_price = parseFloat(p.purchase_price); else delete p.purchase_price;
      ['sub_category','product_id','serial_number','purchase_date','expiry_date','warranty_expiry','vendor','notes','location'].forEach(k => { if (!p[k]) delete p[k]; });
      delete p.min_stock;
      await axios.post(`${API}/items`, p);
      toast.success('Item added');
      setAddItemDialog(false);
      setNewItemForm({ name: '', category: '', sub_category: '', total_quantity: 1, location: '', product_id: '', serial_number: '', purchase_date: '', expiry_date: '', warranty_expiry: '', vendor: '', purchase_price: '', notes: '' });
      fetchItems();
    } catch { toast.error('Failed to add item'); }
  };

  const handleEditItem = async () => {
    if (!editForm.name || !editForm.category) { toast.error('Name and category required'); return; }
    try {
      const p = { ...editForm };
      delete p.total_quantity; // quantity only changes via wrap-up
      if (p.purchase_price) p.purchase_price = parseFloat(p.purchase_price); else delete p.purchase_price;
      await axios.put(`${API}/items/${selectedItem.id}`, p);
      toast.success('Item updated');
      setEditItemDialog(false); fetchItems();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to update'); }
  };

  const badge = (status) => ({
    'Available': 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
    'Under Maintenance': 'bg-blue-950/40 text-blue-400 border-blue-900/50',
    'Reserved': 'bg-orange-950/40 text-orange-400 border-orange-900/50',
    'Lost': 'bg-red-950/40 text-red-400 border-red-900/50'
  }[status] || 'bg-[#232328] text-[#71717A] border-[#232328]');

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-[#52525B] font-data text-sm">LOADING INVENTORY...</div></div>;

  const ItemRow = ({ item }) => (
    <tr key={item.id} data-testid={`item-row-${item.id}`} className="border-b border-[#232328] last:border-b-0 hover:bg-[#1C1C1F] transition-colors">
      <td className="py-3 px-4 w-[40%]">
        <div className="text-white text-sm font-medium">{item.name}</div>
        {item.sub_category && <div className="text-xs text-[#F9982E] mt-0.5">{item.sub_category}</div>}
      </td>
      <td className="py-3 px-3 text-center w-14"><div className="font-data text-sm text-white font-bold">{item.quantity_available}</div><div className="text-[9px] text-[#3F3F46] uppercase">Avail</div></td>
      <td className="py-3 px-3 text-center w-14"><div className={`font-data text-sm font-bold ${item.quantity_out > 0 ? 'text-[#F9982E]' : 'text-[#232328]'}`}>{item.quantity_out}</div><div className="text-[9px] text-[#3F3F46] uppercase">Out</div></td>
      <td className="py-3 px-3 text-center w-14"><div className="font-data text-sm text-[#52525B]">{item.total_quantity}</div><div className="text-[9px] text-[#3F3F46] uppercase">Total</div></td>
      <td className="py-3 px-3 text-center w-24"><span className={`font-data text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${badge(item.status)}`}>{item.status}</span></td>
      <td className="py-3 px-4 text-right w-28">
        <div className="flex items-center justify-end gap-1">
          {canDeleteInventory && <button onClick={() => handleDeleteItem(item)} data-testid={`delete-${item.id}`} className="p-1.5 rounded hover:bg-red-500/10 text-[#3F3F46] hover:text-red-400 transition-colors" title="Delete"><Trash2 size={13} /></button>}
          {canManageInventory && <button onClick={() => openEdit(item)} data-testid={`edit-${item.id}`} className="p-1.5 rounded hover:bg-[#232328] text-[#52525B] hover:text-white transition-colors" title="Edit"><Pencil size={13} /></button>}
          <button onClick={() => openMarkOut(item)} data-testid={`mark-out-${item.id}`} disabled={item.quantity_available === 0 || item.status !== 'Available'}
            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${item.quantity_out > 0 ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white' : 'bg-[#F9982E] hover:bg-[#F9982E]/90 text-black'}`}>
            {item.quantity_out > 0 ? 'Add' : 'Out'}
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight" data-testid="inventory-title">INVENTORY</h1>
          <p className="text-[#52525B] mt-1 text-sm">{filteredItems.length} of {items.length} items</p>
        </div>
        {canManageInventory && <Button onClick={() => setAddItemDialog(true)} data-testid="add-item-button" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg text-xs">
          <Plus size={16} className="mr-1.5" />Add Item
        </Button>}
      </div>

      <div className="flex gap-5">
        {/* Category Sidebar */}
        <div className="w-56 shrink-0 hidden lg:block" data-testid="category-sidebar">
          <div className="sticky top-20 space-y-1">
            <button onClick={() => setSelectedCategory('all')} data-testid="cat-all"
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${selectedCategory === 'all' ? 'bg-[#F9982E]/10 text-[#F9982E] border border-[#F9982E]/30' : 'text-[#71717A] hover:text-white hover:bg-[#18181B]'}`}>
              <span>All Categories</span><span className="font-data text-[10px]">{items.length}</span>
            </button>
            {categories.map(([cat, data]) => {
              const color = categoryColors[cat] || '#71717A';
              const icon = categoryIcons[cat] || cat[0];
              return (
                <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)} data-testid={`cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${selectedCategory === cat ? 'bg-[#18181B] text-white border border-[#232328]' : 'text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#18181B]/50'}`}>
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: color + '20', color }}>{icon}</span>
                  <span className="truncate flex-1">{cat}</span>
                  <span className="font-data text-[10px] text-[#3F3F46]">{data.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3F3F46]" size={16} />
              <Input placeholder="Search items..." data-testid="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-[#18181B] border-[#232328] focus:border-[#F9982E] text-white h-10 text-sm" />
            </div>
            <div className="lg:hidden">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="category-filter" className="bg-[#18181B] border-[#232328] text-white h-10 w-40 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#232328]">{categories.map(([cat]) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid="status-filter" className="bg-[#18181B] border-[#232328] text-white h-10 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="all">All Status</SelectItem><SelectItem value="Available">Available</SelectItem><SelectItem value="Under Maintenance">Maintenance</SelectItem><SelectItem value="Lost">Lost</SelectItem></SelectContent>
            </Select>
            <Select value={selectedCheckoutFilter} onValueChange={setSelectedCheckoutFilter}>
              <SelectTrigger data-testid="checkout-filter" className="bg-[#18181B] border-[#232328] text-white h-10 w-36 text-xs"><SelectValue placeholder="Checkout" /></SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="all">All Items</SelectItem><SelectItem value="out">Checked Out</SelectItem><SelectItem value="in">In Stock</SelectItem></SelectContent>
            </Select>
          </div>

          {selectedCategory === 'all' ? (
            <div className="space-y-4">
              {groupedItems.map(([cat, catItems]) => {
                const color = categoryColors[cat] || '#71717A';
                return (
                  <div key={cat} data-testid={`group-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                    <div className="flex items-center gap-2 mb-2 px-1"><div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} /><span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">{cat}</span><span className="text-[10px] text-[#3F3F46] font-data">{catItems.length}</span></div>
                    <div className="bg-[#18181B] border border-[#232328] rounded-lg overflow-hidden">
                      <table className="w-full"><tbody>{catItems.map(item => <ItemRow key={item.id} item={item} />)}</tbody></table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#18181B] border border-[#232328] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-[#232328]">
                  <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Item Name</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase">Avail</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase">Out</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase">Total</th>
                  <th className="text-center py-2.5 px-3 text-[10px] font-bold text-[#52525B] uppercase">Status</th>
                  <th className="text-right py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase">Action</th>
                </tr></thead>
                <tbody>{filteredItems.map(item => <ItemRow key={item.id} item={item} />)}</tbody>
              </table>
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="bg-[#18181B] border border-[#232328] rounded-lg p-12 text-center">
              <Package size={32} className="text-[#232328] mx-auto mb-3" /><p className="text-[#3F3F46] text-sm">No items match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mark Out Dialog */}
      <Dialog open={markOutDialog} onOpenChange={setMarkOutDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-md" data-testid="mark-out-dialog">
          <DialogHeader><DialogTitle className="font-heading text-xl font-bold">MARK OUT: {selectedItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label className="text-[#52525B] text-xs block">Available: <span className="text-white font-data font-bold">{selectedItem?.quantity_available}</span></Label>
            <div><Label className="text-white text-sm mb-2 block">Project / Shoot *</Label>
              <Select value={markOutForm.project_id} onValueChange={handleProjectChange}>
                <SelectTrigger data-testid="project-select" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#232328]">{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-white text-sm mb-2 block">Quantity *</Label>
              <Input type="number" data-testid="quantity-input" min="1" max={selectedItem?.quantity_available} value={markOutForm.quantity} onChange={(e) => setMarkOutForm({ ...markOutForm, quantity: parseInt(e.target.value) || 1 })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" />
            </div>
            <div><Label className="text-white text-sm mb-2 block">Expected Return *</Label>
              <Input type="datetime-local" data-testid="return-date-input" value={markOutForm.expected_return} onChange={(e) => setMarkOutForm({ ...markOutForm, expected_return: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" />
            </div>
            <div><Label className="text-white text-sm mb-2 block">Notes</Label>
              <Input data-testid="notes-input" value={markOutForm.notes} onChange={(e) => setMarkOutForm({ ...markOutForm, notes: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="Optional..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setMarkOutDialog(false)} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">Cancel</Button>
            <Button onClick={handleMarkOut} data-testid="confirm-mark-out" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">Confirm Mark Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialog} onOpenChange={setAddItemDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-lg max-h-[85vh] overflow-y-auto" data-testid="add-item-dialog">
          <DialogHeader><DialogTitle className="font-heading text-xl font-bold">ADD NEW ITEM</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-white text-sm mb-2 block">Item Name *</Label><Input data-testid="item-name-input" value={newItemForm.name} onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Category *</Label>
                <Select value={newItemForm.category} onValueChange={(v) => setNewItemForm({ ...newItemForm, category: v })}>
                  <SelectTrigger data-testid="item-category-input" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">{categories.map(([cat]) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}<SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-white text-sm mb-2 block">Sub-Category</Label><Input data-testid="item-subcategory-input" value={newItemForm.sub_category} onChange={(e) => setNewItemForm({ ...newItemForm, sub_category: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Quantity *</Label><Input type="number" data-testid="item-quantity-input" min="1" value={newItemForm.total_quantity} onChange={(e) => setNewItemForm({ ...newItemForm, total_quantity: parseInt(e.target.value) || 1 })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Location (City)</Label><Input data-testid="item-location-input" value={newItemForm.location} onChange={(e) => setNewItemForm({ ...newItemForm, location: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. Mumbai" /></div>
            </div>
            <div className="flex items-center gap-2 pt-2"><div className="h-px flex-1 bg-[#232328]" /><span className="text-[10px] text-[#3F3F46] uppercase tracking-widest">Product Details</span><div className="h-px flex-1 bg-[#232328]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Product ID / SKU</Label><Input data-testid="item-product-id-input" value={newItemForm.product_id} onChange={(e) => setNewItemForm({ ...newItemForm, product_id: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Serial Number</Label><Input data-testid="item-serial-input" value={newItemForm.serial_number} onChange={(e) => setNewItemForm({ ...newItemForm, serial_number: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Vendor</Label><Input data-testid="item-vendor-input" value={newItemForm.vendor} onChange={(e) => setNewItemForm({ ...newItemForm, vendor: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Purchase Price</Label><Input type="number" step="0.01" data-testid="item-price-input" value={newItemForm.purchase_price} onChange={(e) => setNewItemForm({ ...newItemForm, purchase_price: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
            </div>
            <div className="flex items-center gap-2 pt-2"><div className="h-px flex-1 bg-[#232328]" /><span className="text-[10px] text-[#3F3F46] uppercase tracking-widest">Dates</span><div className="h-px flex-1 bg-[#232328]" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Purchase Date</Label><Input type="date" data-testid="item-purchase-date-input" value={newItemForm.purchase_date} onChange={(e) => setNewItemForm({ ...newItemForm, purchase_date: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Expiry Date</Label><Input type="date" data-testid="item-expiry-date-input" value={newItemForm.expiry_date} onChange={(e) => setNewItemForm({ ...newItemForm, expiry_date: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Warranty Expiry</Label><Input type="date" data-testid="item-warranty-input" value={newItemForm.warranty_expiry} onChange={(e) => setNewItemForm({ ...newItemForm, warranty_expiry: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
            </div>
            <div><Label className="text-white text-sm mb-2 block">Notes</Label><Input data-testid="item-notes-input" value={newItemForm.notes} onChange={(e) => setNewItemForm({ ...newItemForm, notes: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAddItemDialog(false)} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">Cancel</Button>
            <Button onClick={handleAddItem} data-testid="confirm-add-item" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialog} onOpenChange={setEditItemDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-lg max-h-[85vh] overflow-y-auto" data-testid="edit-item-dialog">
          <DialogHeader><DialogTitle className="font-heading text-xl font-bold">EDIT: {selectedItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-white text-sm mb-2 block">Item Name *</Label><Input data-testid="edit-name-input" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Category *</Label>
                <Select value={editForm.category || ''} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger data-testid="edit-category-input" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">{categories.map(([cat]) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}<SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-white text-sm mb-2 block">Sub-Category</Label><Input data-testid="edit-subcategory-input" value={editForm.sub_category || ''} onChange={(e) => setEditForm({ ...editForm, sub_category: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-[#52525B] text-sm mb-2 block">Total Quantity <span className="text-[10px] text-[#3F3F46]">(changes only via wrap-up)</span></Label><div className="bg-[#0F0F0F] border border-[#232328] rounded-lg h-11 flex items-center px-3 text-white font-data font-bold opacity-60">{selectedItem?.total_quantity}</div></div>
              <div><Label className="text-white text-sm mb-2 block">Location (City)</Label><Input data-testid="edit-location-input" value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Status</Label>
                <Select value={editForm.status || 'Available'} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger data-testid="edit-status-input" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="Available">Available</SelectItem><SelectItem value="Under Maintenance">Under Maintenance</SelectItem><SelectItem value="Reserved">Reserved</SelectItem><SelectItem value="Lost">Lost</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-white text-sm mb-2 block">Condition</Label>
                <Select value={editForm.condition || 'OK'} onValueChange={(v) => setEditForm({ ...editForm, condition: v })}>
                  <SelectTrigger data-testid="edit-condition-input" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="OK">OK</SelectItem><SelectItem value="Needs Repair">Needs Repair</SelectItem><SelectItem value="Damaged">Damaged</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2"><div className="h-px flex-1 bg-[#232328]" /><span className="text-[10px] text-[#3F3F46] uppercase tracking-widest">Product Details</span><div className="h-px flex-1 bg-[#232328]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Product ID / SKU</Label><Input data-testid="edit-product-id-input" value={editForm.product_id || ''} onChange={(e) => setEditForm({ ...editForm, product_id: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Serial Number</Label><Input data-testid="edit-serial-input" value={editForm.serial_number || ''} onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Vendor</Label><Input data-testid="edit-vendor-input" value={editForm.vendor || ''} onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Purchase Price</Label><Input type="number" step="0.01" data-testid="edit-price-input" value={editForm.purchase_price || ''} onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
            </div>
            <div className="flex items-center gap-2 pt-2"><div className="h-px flex-1 bg-[#232328]" /><span className="text-[10px] text-[#3F3F46] uppercase tracking-widest">Dates</span><div className="h-px flex-1 bg-[#232328]" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Purchase Date</Label><Input type="date" data-testid="edit-purchase-date" value={editForm.purchase_date || ''} onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Expiry Date</Label><Input type="date" data-testid="edit-expiry-date" value={editForm.expiry_date || ''} onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Warranty Expiry</Label><Input type="date" data-testid="edit-warranty" value={editForm.warranty_expiry || ''} onChange={(e) => setEditForm({ ...editForm, warranty_expiry: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
            </div>
            <div><Label className="text-white text-sm mb-2 block">Notes</Label><Input data-testid="edit-notes-input" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditItemDialog(false)} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">Cancel</Button>
            <Button onClick={handleEditItem} data-testid="confirm-edit-item" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
