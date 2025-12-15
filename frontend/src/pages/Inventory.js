import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCheckoutFilter, setSelectedCheckoutFilter] = useState('all'); // New filter
  const [markOutDialog, setMarkOutDialog] = useState(false);
  const [addItemDialog, setAddItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [markOutForm, setMarkOutForm] = useState({
    project_id: '',
    quantity: 1,
    expected_return: '',
    notes: ''
  });
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category: '',
    total_quantity: 1,
    location_in_studio: '',
    min_stock: null
  });

  useEffect(() => {
    fetchItems();
    fetchProjects();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/items`);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
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

  const openMarkOut = (item) => {
    setSelectedItem(item);
    setMarkOutForm({
      project_id: '',
      quantity: 1,
      expected_return: '',
      notes: ''
    });
    setMarkOutDialog(true);
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    let expectedReturn = '';
    
    if (project?.end_date) {
      // Convert YYYY-MM-DD to datetime-local format (YYYY-MM-DDTHH:MM)
      expectedReturn = `${project.end_date}T18:00`;
    }
    
    setMarkOutForm({
      ...markOutForm,
      project_id: projectId,
      expected_return: expectedReturn
    });
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
      await axios.post(`${API}/checkouts/mark-out`, {
        item_id: selectedItem.id,
        ...markOutForm
      });
      toast.success(`${selectedItem.name} marked out successfully`);
      setMarkOutDialog(false);
      fetchItems();
    } catch (error) {
      console.error('Failed to mark out:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark out item');
    }
  };

  const handleAddItem = async () => {
    if (!newItemForm.name || !newItemForm.category || newItemForm.total_quantity < 1) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/items`, newItemForm);
      toast.success('Item added successfully');
      setAddItemDialog(false);
      setNewItemForm({
        name: '',
        category: '',
        total_quantity: 1,
        location_in_studio: '',
        min_stock: null
      });
      fetchItems();
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
    }
  };

  const categories = [...new Set(items.map(item => item.category))];
  const statuses = ['Available', 'Under Maintenance', 'Reserved', 'Lost'];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      'Available': 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
      'Under Maintenance': 'bg-blue-950/30 text-blue-400 border-blue-900',
      'Reserved': 'bg-orange-950/30 text-orange-400 border-orange-900',
      'Lost': 'bg-red-950/30 text-red-400 border-red-900'
    };
    return badges[status] || 'bg-[#3F3F46] text-white border-[#3F3F46]';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING INVENTORY...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="inventory-title">
            INVENTORY
          </h1>
          <p className="text-[#A1A1AA] mt-2">{filteredItems.length} items in studio</p>
        </div>
        <Button
          onClick={() => setAddItemDialog(true)}
          data-testid="add-item-button"
          className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
        >
          <Plus size={18} className="mr-2" />
          Add Item
        </Button>
      </div>

      <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#71717A]" size={18} />
            <Input
              placeholder="Search items..."
              data-testid="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger data-testid="category-filter" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#27272A] border-[#3F3F46]">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger data-testid="status-filter" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#27272A] border-[#3F3F46]">
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="inventory-table">
            <thead>
              <tr className="border-b border-[#3F3F46]">
                <th className="text-left py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Item Name</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Category</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Available</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Out</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Total</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-sm font-bold text-[#A1A1AA] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} data-testid={`item-row-${item.id}`} className="border-b border-[#3F3F46] hover:bg-[#1B1B1B] transition-colors">
                  <td className="py-4 px-4 text-white font-f1 text-lg">{item.name}</td>
                  <td className="py-4 px-4 text-[#A1A1AA]">{item.category}</td>
                  <td className="py-4 px-4 text-center font-data text-white font-bold">{item.quantity_available}</td>
                  <td className="py-4 px-4 text-center font-data text-[#F9982E] font-bold">{item.quantity_out}</td>
                  <td className="py-4 px-4 text-center font-data text-[#A1A1AA]">{item.total_quantity}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-2xl border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button
                      onClick={() => openMarkOut(item)}
                      data-testid={`mark-out-${item.id}`}
                      disabled={item.quantity_available === 0 || item.status !== 'Available'}
                      className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark Out
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={markOutDialog} onOpenChange={setMarkOutDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="mark-out-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">
              MARK OUT: {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-[#A1A1AA] text-sm mb-2 block">Available: <span className="text-white font-data font-bold">{selectedItem?.quantity_available}</span></Label>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Project / Shoot *</Label>
              <Select value={markOutForm.project_id} onValueChange={handleProjectChange}>
                <SelectTrigger data-testid="project-select" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  {projects.map(proj => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                      {proj.end_date && <span className="text-[#71717A] ml-2 text-xs">→ {new Date(proj.end_date).toLocaleDateString()}</span>}
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
                onChange={(e) => setMarkOutForm({...markOutForm, quantity: parseInt(e.target.value) || 1})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">
                Expected Return Date * 
                {markOutForm.project_id && projects.find(p => p.id === markOutForm.project_id)?.end_date && (
                  <span className="text-[#F9982E] text-xs ml-2">(Auto-filled from project)</span>
                )}
              </Label>
              <Input
                type="datetime-local"
                data-testid="return-date-input"
                value={markOutForm.expected_return}
                onChange={(e) => setMarkOutForm({...markOutForm, expected_return: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Notes (Optional)</Label>
              <Input
                data-testid="notes-input"
                value={markOutForm.notes}
                onChange={(e) => setMarkOutForm({...markOutForm, notes: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                placeholder="Any special notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setMarkOutDialog(false)}
              data-testid="cancel-mark-out"
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkOut}
              data-testid="confirm-mark-out"
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
            >
              Confirm Mark Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addItemDialog} onOpenChange={setAddItemDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="add-item-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">ADD NEW ITEM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white text-sm mb-2 block">Item Name *</Label>
              <Input
                data-testid="item-name-input"
                value={newItemForm.name}
                onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Category *</Label>
              <Input
                data-testid="item-category-input"
                value={newItemForm.category}
                onChange={(e) => setNewItemForm({...newItemForm, category: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Total Quantity *</Label>
              <Input
                type="number"
                data-testid="item-quantity-input"
                min="1"
                value={newItemForm.total_quantity}
                onChange={(e) => setNewItemForm({...newItemForm, total_quantity: parseInt(e.target.value) || 1})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Location in Studio</Label>
              <Input
                data-testid="item-location-input"
                value={newItemForm.location_in_studio}
                onChange={(e) => setNewItemForm({...newItemForm, location_in_studio: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setAddItemDialog(false)}
              data-testid="cancel-add-item"
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              data-testid="confirm-add-item"
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}