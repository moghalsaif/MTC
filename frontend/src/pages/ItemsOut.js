import { useState, useEffect } from 'react';
import axios from 'axios';
import { PackageOpen, AlertTriangle, FileText, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRightLeft, Minus, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ItemsOut() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [checkouts, setCheckouts] = useState([]); // Active checkouts for mark-in
  const [allProjectCheckouts, setAllProjectCheckouts] = useState([]); // ALL checkouts (for PDF)
  const [loading, setLoading] = useState(true);
  
  // Partial mark-in state
  const [markInDialog, setMarkInDialog] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState(null);
  const [markInQuantity, setMarkInQuantity] = useState(1);
  const [markInCondition, setMarkInCondition] = useState('good');
  
  // Transfer dialog state
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferCheckout, setTransferCheckout] = useState(null);
  const [transferTargetProject, setTransferTargetProject] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferType, setTransferType] = useState('full');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchCheckoutsForProject(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      const activeProjects = response.data.filter(p => p.status !== 'Wrapped');
      setProjects(activeProjects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckoutsForProject = async (projectId) => {
    try {
      // Fetch active checkouts for mark-in actions
      const activeResponse = await axios.get(`${API}/checkouts/active`);
      const activeProjectCheckouts = activeResponse.data.filter(c => c.project_id === projectId);
      setCheckouts(activeProjectCheckouts);
      
      // Fetch ALL checkouts for PDF generation (including completed)
      const allResponse = await axios.get(`${API}/checkouts/project/${projectId}`);
      setAllProjectCheckouts(allResponse.data);
    } catch (error) {
      console.error('Failed to fetch checkouts:', error);
      toast.error('Failed to load items for this project');
    }
  };

  // Quick mark-in for full quantity
  const handleQuickMarkIn = async (checkoutId, condition) => {
    try {
      const response = await axios.post(`${API}/checkouts/quick-mark-in`, {
        checkout_id: checkoutId,
        condition: condition,
        quantity_returned: null // Returns all
      });
      
      const duration = response.data.packing_duration_minutes;
      if (duration) {
        toast.success(`Marked in! Packing time: ${duration} min`);
      } else {
        toast.success('Item marked in successfully');
      }
      
      fetchCheckoutsForProject(selectedProjectId);
    } catch (error) {
      console.error('Failed to mark in:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark in item');
    }
  };

  // Open partial mark-in dialog
  const openPartialMarkIn = (checkout) => {
    setSelectedCheckout(checkout);
    const remaining = checkout.quantity_out - (checkout.quantity_returned || 0);
    setMarkInQuantity(remaining);
    setMarkInCondition('good');
    setMarkInDialog(true);
  };

  // Handle partial mark-in
  const handlePartialMarkIn = async () => {
    if (!selectedCheckout) return;
    
    try {
      const response = await axios.post(`${API}/checkouts/quick-mark-in`, {
        checkout_id: selectedCheckout.id,
        condition: markInCondition,
        quantity_returned: markInQuantity
      });
      
      if (response.data.status === 'Completed') {
        toast.success(`All ${markInQuantity} item(s) marked in!`);
      } else {
        toast.success(`${markInQuantity} item(s) marked in. ${response.data.remaining} remaining.`);
      }
      
      setMarkInDialog(false);
      fetchCheckoutsForProject(selectedProjectId);
    } catch (error) {
      console.error('Failed to mark in:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark in item');
    }
  };

  // Open transfer dialog
  const openTransferDialog = (checkout) => {
    setTransferCheckout(checkout);
    const remaining = checkout.quantity_out - (checkout.quantity_returned || 0);
    setTransferQuantity(remaining);
    setTransferTargetProject('');
    setTransferType('full');
    setTransferDialog(true);
  };

  // Handle transfer
  const handleTransfer = async () => {
    if (!transferCheckout || !transferTargetProject) {
      toast.error('Please select a target project');
      return;
    }
    
    const qty = transferType === 'full' 
      ? transferCheckout.quantity_out - (transferCheckout.quantity_returned || 0)
      : transferQuantity;
    
    try {
      const response = await axios.post(`${API}/checkouts/transfer`, {
        checkout_id: transferCheckout.id,
        target_project_id: transferTargetProject,
        quantity_to_transfer: qty
      });
      
      toast.success(response.data.message);
      setTransferDialog(false);
      fetchCheckoutsForProject(selectedProjectId);
    } catch (error) {
      console.error('Failed to transfer:', error);
      toast.error(error.response?.data?.detail || 'Failed to transfer equipment');
    }
  };

  const handleGeneratePDF = async () => {
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    try {
      toast.info('Generating packing list...');
      const response = await axios.get(`${API}/projects/${selectedProjectId}/packing-list-pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `packing_list_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Packing list downloaded');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate packing list');
    }
  };

  const isOverdue = (expectedReturn) => {
    return new Date(expectedReturn) < new Date();
  };

  const getElapsedTime = (startTime) => {
    if (!startTime) return null;
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now - start) / 1000 / 60);
    
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRemainingQty = (checkout) => {
    return checkout.quantity_out - (checkout.quantity_returned || 0);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isPacking = checkouts.length > 0 && checkouts[0]?.packing_start_time;
  const elapsedTime = isPacking ? getElapsedTime(checkouts[0].packing_start_time) : null;
  
  // Filter out other projects for transfer (exclude current project)
  const otherProjects = projects.filter(p => p.id !== selectedProjectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING PROJECTS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="items-out-title">
          WRAP-UP CENTER
        </h1>
        <p className="text-[#A1A1AA] mt-2">Select a project to view and pack items</p>
      </div>

      {/* Project Selector */}
      <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <label className="text-sm font-medium text-white mb-2 block">SELECT PROJECT</label>
            <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
              <SelectTrigger data-testid="project-selector" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12 rounded-xl">
                <SelectValue placeholder="Choose a project to view items..." />
              </SelectTrigger>
              <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-white">{project.name}</span>
                      <span className="text-xs text-[#A1A1AA] ml-4">
                        {project.status === 'Active' ? '🟢 Active' : '🟡 Planning'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProject && allProjectCheckouts.length > 0 && (
            <div className="flex items-center space-x-4">
              {isPacking && elapsedTime && (
                <div className="bg-emerald-950/30 border border-emerald-900 px-4 py-2 rounded-2xl flex items-center space-x-2">
                  <Clock size={16} className="text-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-data text-sm font-bold">{elapsedTime} ELAPSED</span>
                </div>
              )}
              <Button
                onClick={handleGeneratePDF}
                data-testid="generate-pdf"
                className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl shadow-lg"
              >
                <FileText size={16} className="mr-2" />
                {checkouts.length === 0 ? 'Return Confirmation PDF' : 'Packing List PDF'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-12 text-center">
          <PackageOpen size={48} className="mx-auto text-[#71717A] mb-4" />
          <div className="text-white text-lg font-medium mb-2">Select a project to get started</div>
          <div className="text-[#A1A1AA]">Choose a project from the dropdown above to view items that need packing</div>
        </div>
      ) : checkouts.length === 0 && allProjectCheckouts.length === 0 ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-12 text-center" data-testid="no-items-assigned">
          <PackageOpen size={48} className="mx-auto text-[#71717A] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No items assigned to this project</div>
          <div className="text-[#A1A1AA]">Go to Inventory and mark items out for {selectedProject?.name}</div>
        </div>
      ) : checkouts.length === 0 && allProjectCheckouts.length > 0 ? (
        // CRITICAL: Check for missing items - cannot show 100% verified if any items are missing
        (() => {
          const totalOut = allProjectCheckouts.reduce((sum, c) => sum + c.quantity_out, 0);
          const totalReturned = allProjectCheckouts.reduce((sum, c) => sum + (c.quantity_returned || 0), 0);
          const totalMissing = allProjectCheckouts.reduce((sum, c) => sum + (c.quantity_missing || 0), 0);
          const totalPending = totalOut - totalReturned - totalMissing;
          const isFullyVerified = totalMissing === 0 && totalPending <= 0;
          
          if (totalMissing > 0) {
            // MISSING ITEMS - VERIFICATION FAILED
            return (
              <div className="bg-[#27272A] border border-red-900 rounded-2xl p-8" data-testid="items-missing">
                <div className="text-center mb-6">
                  <XCircle size={64} className="mx-auto text-red-500 mb-4" />
                  <div className="text-red-400 text-2xl font-heading font-bold mb-2">✕ INVENTORY VERIFICATION FAILED</div>
                  <div className="text-white text-lg font-medium mb-2">{totalMissing} item(s) are MISSING</div>
                  <div className="text-[#A1A1AA]">
                    This project cannot be considered verified until all items are accounted for.
                  </div>
                </div>
                
                <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 mb-6">
                  <div className="text-sm text-[#71717A] uppercase tracking-wider mb-3">Verification Summary</div>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white font-data">{totalOut}</div>
                      <div className="text-xs text-[#A1A1AA]">Total Out</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-400 font-data">{totalReturned}</div>
                      <div className="text-xs text-[#A1A1AA]">Returned</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500 font-data">{totalMissing}</div>
                      <div className="text-xs text-red-400">MISSING</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#F9982E] font-data">{Math.round((totalReturned / totalOut) * 100)}%</div>
                      <div className="text-xs text-[#A1A1AA]">Verified</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-red-400 mb-3">Generate report documenting missing items</div>
                  <Button
                    onClick={handleGeneratePDF}
                    data-testid="generate-missing-report-pdf"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-2xl shadow-lg"
                  >
                    <FileText size={16} className="mr-2" />
                    Generate Verification Report
                  </Button>
                </div>
              </div>
            );
          }
          
          // 100% VERIFIED - All items returned, none missing
          return (
            <div className="bg-[#27272A] border border-emerald-900 rounded-2xl p-8" data-testid="all-items-returned">
              <div className="text-center mb-6">
                <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4" />
                <div className="text-emerald-400 text-2xl font-heading font-bold mb-2">✓ 100% INVENTORY VERIFIED</div>
                <div className="text-white text-lg font-medium mb-2">All items returned for {selectedProject?.name}</div>
                <div className="text-[#A1A1AA]">
                  {allProjectCheckouts.length} item(s) were assigned to this project and have been verified as returned.
                </div>
              </div>
              
              <div className="bg-[#1B1B1B] rounded-2xl p-4 mb-6">
                <div className="text-sm text-[#71717A] uppercase tracking-wider mb-3">Return Summary</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white font-data">{allProjectCheckouts.length}</div>
                    <div className="text-xs text-[#A1A1AA]">Items Assigned</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400 font-data">{totalOut}</div>
                    <div className="text-xs text-[#A1A1AA]">Total Qty Out</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400 font-data">{totalReturned}</div>
                    <div className="text-xs text-[#A1A1AA]">Total Returned</div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-[#A1A1AA] mb-3">Generate final confirmation document for audit records</div>
                <Button
                  onClick={handleGeneratePDF}
                  data-testid="generate-confirmation-pdf"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider rounded-2xl shadow-lg"
                >
                  <FileText size={16} className="mr-2" />
                  Generate Return Confirmation PDF
                </Button>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="space-y-6">
          <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#3F3F46]">
              <div>
                <h2 className="font-heading text-2xl font-bold text-white">{selectedProject?.name}</h2>
                <div className="text-sm text-[#A1A1AA] mt-1">{checkouts.length} item(s) to pack</div>
              </div>
            </div>

            {isPacking && (
              <div className="bg-emerald-950/30 border border-emerald-900 rounded-2xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <Clock className="text-emerald-400 mt-0.5 animate-pulse" size={20} />
                  <div className="text-sm text-emerald-300">
                    <strong>Timer started automatically!</strong> Mark each item as you pack it. Packing time is being tracked.
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {checkouts.map((checkout) => {
                const remaining = getRemainingQty(checkout);
                const hasPartialReturn = (checkout.quantity_returned || 0) > 0;
                
                return (
                  <div
                    key={checkout.id}
                    data-testid={`checkout-${checkout.id}`}
                    className={`bg-[#1B1B1B] border rounded-2xl p-5 ${
                      isOverdue(checkout.expected_return) 
                        ? 'border-[#EF4444]' 
                        : hasPartialReturn
                        ? 'border-[#F59E0B]'
                        : 'border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="text-white font-f1 text-lg">{checkout.item_name}</div>
                          {isOverdue(checkout.expected_return) && (
                            <span className="bg-red-950/30 text-red-400 border-red-900 border px-2 py-1 rounded-2xl text-xs font-mono uppercase tracking-widest flex items-center space-x-1">
                              <AlertTriangle size={12} />
                              <span>OVERDUE</span>
                            </span>
                          )}
                          {hasPartialReturn && (
                            <span className="bg-orange-950/30 text-orange-400 border-orange-900 border px-2 py-1 rounded-2xl text-xs font-mono uppercase tracking-widest">
                              PARTIAL RETURN
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Qty Out</div>
                            <div className="text-white font-data font-bold text-lg">{checkout.quantity_out}</div>
                          </div>
                          <div>
                            <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Returned</div>
                            <div className="text-emerald-400 font-data font-bold text-lg">{checkout.quantity_returned || 0}</div>
                          </div>
                          <div>
                            <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Remaining</div>
                            <div className={`font-data font-bold text-lg ${remaining > 0 ? 'text-[#F9982E]' : 'text-emerald-400'}`}>
                              {remaining}
                            </div>
                          </div>
                          <div>
                            <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Expected Return</div>
                            <div className={isOverdue(checkout.expected_return) ? 'text-[#EF4444] font-bold' : 'text-white'}>
                              {new Date(checkout.expected_return).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col space-y-2">
                        <div className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Actions:</div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleQuickMarkIn(checkout.id, 'good')}
                            data-testid={`mark-in-good-${checkout.id}`}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#10B981] hover:bg-[#10B981]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                            title="Mark all remaining as good"
                          >
                            <CheckCircle2 size={16} />
                            <span>All Good</span>
                          </button>
                          <button
                            onClick={() => openPartialMarkIn(checkout)}
                            data-testid={`mark-in-partial-${checkout.id}`}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                            title="Mark specific quantity"
                          >
                            <Minus size={16} />
                            <span>Partial</span>
                          </button>
                          <button
                            onClick={() => openTransferDialog(checkout)}
                            data-testid={`transfer-${checkout.id}`}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                            title="Transfer to another project"
                          >
                            <ArrowRightLeft size={16} />
                            <span>Transfer</span>
                          </button>
                        </div>
                        <div className="flex space-x-2 mt-1">
                          <button
                            onClick={() => handleQuickMarkIn(checkout.id, 'damaged')}
                            data-testid={`mark-in-damaged-${checkout.id}`}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                            title="Item has damage - will create issue"
                          >
                            <AlertCircle size={16} />
                            <span>Damaged</span>
                          </button>
                          <button
                            onClick={() => handleQuickMarkIn(checkout.id, 'missing')}
                            data-testid={`mark-in-missing-${checkout.id}`}
                            className="flex items-center space-x-2 px-4 py-2 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                            title="Item not returned - will mark as lost"
                          >
                            <XCircle size={16} />
                            <span>Missing</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Partial Mark-In Dialog */}
      <Dialog open={markInDialog} onOpenChange={setMarkInDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="partial-mark-in-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">
              PARTIAL MARK IN
            </DialogTitle>
          </DialogHeader>
          {selectedCheckout && (
            <div className="space-y-4 py-4">
              <div className="bg-[#1B1B1B] rounded-xl p-4">
                <div className="text-white font-f1 text-lg mb-2">{selectedCheckout.item_name}</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-[#71717A] text-xs">Out</div>
                    <div className="text-white font-bold">{selectedCheckout.quantity_out}</div>
                  </div>
                  <div>
                    <div className="text-[#71717A] text-xs">Returned</div>
                    <div className="text-emerald-400 font-bold">{selectedCheckout.quantity_returned || 0}</div>
                  </div>
                  <div>
                    <div className="text-[#71717A] text-xs">Remaining</div>
                    <div className="text-[#F9982E] font-bold">{getRemainingQty(selectedCheckout)}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-white text-sm mb-2 block">Quantity to Return</Label>
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    onClick={() => setMarkInQuantity(Math.max(1, markInQuantity - 1))}
                    className="bg-[#3F3F46] hover:bg-[#52525B] text-white rounded-xl h-12 w-12"
                  >
                    <Minus size={16} />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={getRemainingQty(selectedCheckout)}
                    value={markInQuantity}
                    onChange={(e) => setMarkInQuantity(Math.min(getRemainingQty(selectedCheckout), Math.max(1, parseInt(e.target.value) || 1)))}
                    className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12 text-center font-bold text-xl"
                  />
                  <Button
                    type="button"
                    onClick={() => setMarkInQuantity(Math.min(getRemainingQty(selectedCheckout), markInQuantity + 1))}
                    className="bg-[#3F3F46] hover:bg-[#52525B] text-white rounded-xl h-12 w-12"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-white text-sm mb-2 block">Condition</Label>
                <Select value={markInCondition} onValueChange={setMarkInCondition}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="good">✓ Good Condition</SelectItem>
                    <SelectItem value="damaged">⚠ Damaged (Creates Issue)</SelectItem>
                    <SelectItem value="missing">✕ Missing (Marks as Lost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setMarkInDialog(false)}
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePartialMarkIn}
              className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold uppercase tracking-wider rounded-2xl"
            >
              Mark In {markInQuantity} Item(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="transfer-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold flex items-center space-x-2">
              <ArrowRightLeft size={24} />
              <span>TRANSFER EQUIPMENT</span>
            </DialogTitle>
          </DialogHeader>
          {transferCheckout && (
            <div className="space-y-4 py-4">
              <div className="bg-[#1B1B1B] rounded-xl p-4">
                <div className="text-white font-f1 text-lg mb-2">{transferCheckout.item_name}</div>
                <div className="text-sm text-[#A1A1AA]">
                  From: <span className="text-white font-medium">{transferCheckout.project_name}</span>
                </div>
                <div className="text-sm text-[#A1A1AA] mt-1">
                  Available to transfer: <span className="text-[#F9982E] font-bold">{getRemainingQty(transferCheckout)}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-white text-sm mb-2 block">Target Project *</Label>
                <Select value={transferTargetProject} onValueChange={setTransferTargetProject}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                    <SelectValue placeholder="Select destination project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {otherProjects.map(project => (
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
                    Full ({getRemainingQty(transferCheckout)})
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
                  <div className="flex items-center space-x-3">
                    <Button
                      type="button"
                      onClick={() => setTransferQuantity(Math.max(1, transferQuantity - 1))}
                      className="bg-[#3F3F46] hover:bg-[#52525B] text-white rounded-xl h-12 w-12"
                    >
                      <Minus size={16} />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={getRemainingQty(transferCheckout)}
                      value={transferQuantity}
                      onChange={(e) => setTransferQuantity(Math.min(getRemainingQty(transferCheckout), Math.max(1, parseInt(e.target.value) || 1)))}
                      className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12 text-center font-bold text-xl"
                    />
                    <Button
                      type="button"
                      onClick={() => setTransferQuantity(Math.min(getRemainingQty(transferCheckout), transferQuantity + 1))}
                      className="bg-[#3F3F46] hover:bg-[#52525B] text-white rounded-xl h-12 w-12"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setTransferDialog(false)}
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!transferTargetProject}
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
