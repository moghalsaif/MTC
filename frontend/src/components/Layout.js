import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Package, PackageOpen, FolderKanban, AlertTriangle, PackageX, Wrench, LogOut, ArrowRightLeft, CreditCard, FileText, ChevronDown, Calculator } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const navGroups = [
  {
    label: 'Mach Traffic Controller',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/inventory', icon: Package, label: 'Inventory' },
      { path: '/items-out', icon: PackageOpen, label: 'Items Out' },
      { path: '/projects', icon: FolderKanban, label: 'Projects' },
      { path: '/issues', icon: AlertTriangle, label: 'Issues' },
      { path: '/lost-items', icon: PackageX, label: 'Lost Items' },
      { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
    ],
  },
  {
    label: 'Licences & Assets',
    items: [
      { path: '/licences', icon: CreditCard, label: 'Licences & Assets' },
    ],
  },
  {
    label: 'Documentation',
    items: [
      { path: '/documentation', icon: FileText, label: 'Documents' },
    ],
  },
  {
    label: 'Tools at mach',
    items: [
      { path: '/timecode-calculator', icon: Calculator, label: 'Timecode Calculator' },
    ],
  },
];

function NavDropdown({ group }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  const isGroupActive = group.items.some(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // If single item, render directly
  if (group.items.length === 1) {
    const item = group.items[0];
    const Icon = item.icon;
    const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
    return (
      <Link
        to={item.path}
        data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${
          active ? 'bg-[#F9982E] text-black' : 'text-[#71717A] hover:text-white hover:bg-[#1C1C1F]'
        }`}
      >
        <Icon size={14} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`nav-group-${group.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${
          isGroupActive ? 'bg-[#F9982E]/15 text-[#F9982E]' : 'text-[#71717A] hover:text-white hover:bg-[#1C1C1F]'
        }`}
      >
        <span>{group.label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#18181B] border border-[#232328] rounded-lg shadow-xl py-1 min-w-[180px] z-50">
          {group.items.map(item => {
            const Icon = item.icon;
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-all ${
                  active ? 'bg-[#F9982E]/10 text-[#F9982E]' : 'text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1F]'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [transferDialog, setTransferDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [selectedSourceProject, setSelectedSourceProject] = useState('');
  const [selectedCheckout, setSelectedCheckout] = useState('');
  const [selectedTargetProject, setSelectedTargetProject] = useState('');
  const [transferType, setTransferType] = useState('full');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [loadingData, setLoadingData] = useState(false);

  const openTransferDialog = async () => {
    setLoadingData(true);
    try {
      const [projectsRes, checkoutsRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/checkouts/active`)
      ]);
      setProjects(projectsRes.data.filter(p => p.status !== 'Wrapped'));
      setCheckouts(checkoutsRes.data);
      if (checkoutsRes.data.length === 0) {
        toast.info('No active checkouts to transfer');
        setLoadingData(false);
        return;
      }
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

  const getCheckoutsForProject = () => checkouts.filter(c => c.project_id === selectedSourceProject);
  const getSelectedCheckoutData = () => checkouts.find(c => c.id === selectedCheckout);
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
    <div className="min-h-screen mach-gradient-bg noise-bg">
      <nav className="border-b border-[#232328] bg-[#0F0F0F]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-1">
              <h1 className="font-heading text-base font-black text-white tracking-tight mr-4" data-testid="app-title">
                MACH
              </h1>
              {navGroups.map((group, gi) => (
                <div key={group.label} className="flex items-center">
                  {gi > 0 && <div className="h-5 w-px bg-[#232328] mx-1" />}
                  <NavDropdown group={group} />
                </div>
              ))}
            </div>
            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={openTransferDialog}
                disabled={loadingData}
                data-testid="transfer-button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-black bg-[#F9982E] hover:bg-[#F9982E]/90 transition-all text-xs font-bold disabled:opacity-50"
                title="Transfer Equipment"
              >
                <ArrowRightLeft size={14} />
                <span>Transfer</span>
              </button>
              <div className="h-4 w-px bg-[#232328]" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#52525B] font-data" data-testid="user-name">{user?.name}</span>
                {user?.role && <span data-testid="user-role-badge" className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  user.role === 'admin' ? 'bg-[#F9982E]/15 text-[#F9982E]' : user.role === 'manager' ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]' : 'bg-[#232328] text-[#52525B]'
                }`}>{user.role}</span>}
              </div>
              <button
                onClick={logout}
                data-testid="logout-button"
                className="p-1.5 rounded-lg text-[#52525B] hover:text-white hover:bg-[#EF4444]/80 transition-all"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-[1920px] mx-auto px-6 py-6 relative z-10">
        <Outlet />
      </main>

      {/* Global Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-lg" data-testid="global-transfer-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold flex items-center space-x-2">
              <ArrowRightLeft size={24} />
              <span>TRANSFER EQUIPMENT</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white text-sm mb-2 block">Source Project</Label>
              <Select value={selectedSourceProject} onValueChange={(v) => { setSelectedSourceProject(v); setSelectedCheckout(''); }}>
                <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-11">
                  <SelectValue placeholder="Select source project..." />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#232328]">
                  {projects.filter(p => checkouts.some(c => c.project_id === p.id)).map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSourceProject && (
              <div>
                <Label className="text-white text-sm mb-2 block">Item to Transfer</Label>
                <Select value={selectedCheckout} onValueChange={setSelectedCheckout}>
                  <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-11">
                    <SelectValue placeholder="Select item..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">
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
                    <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-11">
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181B] border-[#232328]">
                      {projects.filter(p => p.id !== selectedSourceProject).map(project => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white text-sm mb-2 block">Transfer Amount</Label>
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => setTransferType('full')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                        transferType === 'full' ? 'bg-[#F9982E] text-black' : 'bg-[#232328] text-[#A1A1AA] hover:bg-[#2C2C30]'
                      }`}
                    >
                      Full ({getRemainingQty(getSelectedCheckoutData())})
                    </button>
                    <button
                      onClick={() => setTransferType('partial')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                        transferType === 'partial' ? 'bg-[#F9982E] text-black' : 'bg-[#232328] text-[#A1A1AA] hover:bg-[#2C2C30]'
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
                      className="bg-[#0F0F0F] border-[#232328] text-white h-11 text-center font-bold"
                    />
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setTransferDialog(false)} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedCheckout || !selectedTargetProject}
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg disabled:opacity-50"
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
