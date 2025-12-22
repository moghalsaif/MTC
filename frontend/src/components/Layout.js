import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Package, PackageOpen, FolderKanban, AlertTriangle, PackageX, Wrench, LogOut, ArrowRightLeft, CreditCard, Command } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Transfer dialog state
  const [transferDialog, setTransferDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [selectedSourceProject, setSelectedSourceProject] = useState('');
  const [selectedCheckout, setSelectedCheckout] = useState('');
  const [selectedTargetProject, setSelectedTargetProject] = useState('');
  const [transferType, setTransferType] = useState('full');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [loadingData, setLoadingData] = useState(false);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/command', icon: Command, label: 'Command Center' },
    { path: '/projects', icon: FolderKanban, label: 'Projects' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/items-out', icon: PackageOpen, label: 'Items Out' },
    { path: '/licences', icon: CreditCard, label: 'Licences' },
    { path: '/issues', icon: AlertTriangle, label: 'Issues' },
    { path: '/lost-items', icon: PackageX, label: 'Lost Items' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  const openTransferDialog = async () => {
    setLoadingData(true);
    try {
      const [projectsRes, checkoutsRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/checkouts/active`)
      ]);
      setProjects(projectsRes.data.filter(p => p.status !== 'Wrapped'));
      setCheckouts(checkoutsRes.data);
      setSelectedSourceProject('');
      setSelectedCheckout('');
      setSelectedTargetProject('');
      setTransferType('full');
      setTransferQuantity(1);
      setTransferDialog(true);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };
  
  const getCheckoutsForProject = () => {
    return checkouts.filter(c => c.project_id === selectedSourceProject);
  };
  
  const getSelectedCheckoutData = () => {
    return checkouts.find(c => c.id === selectedCheckout);
  };
  
  const getRemainingQty = (checkout) => {
    if (!checkout) return 0;
    return checkout.quantity_out - (checkout.quantity_returned || 0);
  };
  
  const handleTransfer = async () => {
    if (!selectedCheckout || !selectedTargetProject) {
      toast.error('Please select an item and target project');
      return;
    }
    
    const checkout = getSelectedCheckoutData();
    const qty = transferType === 'full' ? getRemainingQty(checkout) : transferQuantity;
    
    try {
      const response = await axios.post(`${API}/checkouts/transfer`, {
        checkout_id: selectedCheckout,
        target_project_id: selectedTargetProject,
        quantity_to_transfer: qty
      });
      
      toast.success(response.data.message);
      setTransferDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to transfer equipment');
    }
  };

  return (
    <div className="min-h-screen bg-[#1B1B1B] noise-bg speed-trails">
      <nav className="border-b border-[#3F3F46]/50 bg-[#1B1B1B]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6">
          {/* Top row - Logo and Actions */}
          <div className="flex items-center justify-between py-3 border-b border-[#3F3F46]/30">
            <h1 className="font-heading text-lg font-black text-white tracking-tight" data-testid="app-title">
              MACH TRAFFIC CONTROLLER
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={openTransferDialog}
                disabled={loadingData}
                data-testid="transfer-button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white bg-[#8B5CF6]/80 hover:bg-[#8B5CF6] transition-all text-xs font-medium disabled:opacity-50"
                title="Transfer Equipment"
              >
                <ArrowRightLeft size={14} />
                <span>Transfer</span>
              </button>
              <div className="h-4 w-px bg-[#3F3F46]" />
              <span className="text-xs text-[#71717A]" data-testid="user-name">{user?.name}</span>
              <button
                onClick={logout}
                data-testid="logout-button"
                className="px-3 py-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#EF4444]/80 transition-all text-xs font-medium"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
          {/* Bottom row - Navigation */}
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive(item.path)
                      ? 'bg-[#F9982E] text-black'
                      : 'text-[#71717A] hover:text-white hover:bg-[#27272A]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <main className="max-w-[1920px] mx-auto px-6 py-6 relative z-10">
        <Outlet />
      </main>
      
      {/* Global Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-lg" data-testid="global-transfer-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold flex items-center space-x-2">
              <ArrowRightLeft size={24} />
              <span>TRANSFER EQUIPMENT</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white text-sm mb-2 block">Source Project</Label>
              <Select value={selectedSourceProject} onValueChange={(v) => {
                setSelectedSourceProject(v);
                setSelectedCheckout('');
              }}>
                <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                  <SelectValue placeholder="Select source project..." />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  {projects.filter(p => checkouts.some(c => c.project_id === p.id)).map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSourceProject && (
              <div>
                <Label className="text-white text-sm mb-2 block">Item to Transfer</Label>
                <Select value={selectedCheckout} onValueChange={setSelectedCheckout}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue placeholder="Select item..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {getCheckoutsForProject().map(checkout => (
                      <SelectItem key={checkout.id} value={checkout.id}>
                        {checkout.item_name} ({getRemainingQty(checkout)} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedCheckout && (
              <>
                <div>
                  <Label className="text-white text-sm mb-2 block">Target Project</Label>
                  <Select value={selectedTargetProject} onValueChange={setSelectedTargetProject}>
                    <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                      {projects.filter(p => p.id !== selectedSourceProject).map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-white text-sm mb-2 block">Transfer Amount</Label>
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => setTransferType('full')}
                      className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
                        transferType === 'full' 
                          ? 'bg-[#8B5CF6] text-white' 
                          : 'bg-[#3F3F46] text-[#A1A1AA] hover:bg-[#52525B]'
                      }`}
                    >
                      Full ({getRemainingQty(getSelectedCheckoutData())})
                    </button>
                    <button
                      onClick={() => setTransferType('partial')}
                      className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
                        transferType === 'partial' 
                          ? 'bg-[#8B5CF6] text-white' 
                          : 'bg-[#3F3F46] text-[#A1A1AA] hover:bg-[#52525B]'
                      }`}
                    >
                      Partial
                    </button>
                  </div>
                  
                  {transferType === 'partial' && (
                    <Input
                      type="number"
                      min="1"
                      max={getRemainingQty(getSelectedCheckoutData())}
                      value={transferQuantity}
                      onChange={(e) => setTransferQuantity(Math.min(getRemainingQty(getSelectedCheckoutData()), Math.max(1, parseInt(e.target.value) || 1)))}
                      className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12 text-center font-bold"
                    />
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setTransferDialog(false)}
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedCheckout || !selectedTargetProject}
              className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase tracking-wider rounded-2xl disabled:opacity-50"
            >
              <ArrowRightLeft size={16} className="mr-2" />
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}