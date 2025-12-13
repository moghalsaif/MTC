import { useState, useEffect } from 'react';
import axios from 'axios';
import { PackageOpen, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ItemsOut() {
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markInDialog, setMarkInDialog] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState(null);
  const [markInForm, setMarkInForm] = useState({
    quantity_returned: 0,
    repack_checklist: {
      all_parts_present: false,
      batteries_returned: false,
      no_damage: false,
      cables_included: false
    },
    notes: '',
    issues: []
  });
  const [issueDescription, setIssueDescription] = useState('');

  useEffect(() => {
    fetchActiveCheckouts();
  }, []);

  const fetchActiveCheckouts = async () => {
    try {
      const response = await axios.get(`${API}/checkouts/active`);
      setCheckouts(response.data);
    } catch (error) {
      console.error('Failed to fetch checkouts:', error);
      toast.error('Failed to load items out');
    } finally {
      setLoading(false);
    }
  };

  const openMarkIn = (checkout) => {
    setSelectedCheckout(checkout);
    setMarkInForm({
      quantity_returned: checkout.quantity_out,
      repack_checklist: {
        all_parts_present: false,
        batteries_returned: false,
        no_damage: false,
        cables_included: false
      },
      notes: '',
      issues: []
    });
    setIssueDescription('');
    setMarkInDialog(true);
  };

  const addIssue = () => {
    if (!issueDescription.trim()) return;
    setMarkInForm({
      ...markInForm,
      issues: [...markInForm.issues, issueDescription]
    });
    setIssueDescription('');
  };

  const removeIssue = (index) => {
    setMarkInForm({
      ...markInForm,
      issues: markInForm.issues.filter((_, i) => i !== index)
    });
  };

  const handleMarkIn = async () => {
    if (markInForm.quantity_returned < 0 || markInForm.quantity_returned > selectedCheckout.quantity_out) {
      toast.error('Invalid quantity returned');
      return;
    }

    try {
      const response = await axios.post(`${API}/checkouts/mark-in`, {
        checkout_id: selectedCheckout.id,
        ...markInForm
      });
      
      if (response.data.quantity_missing > 0) {
        toast.warning(`${response.data.quantity_missing} item(s) marked as lost`);
      } else {
        toast.success('Item marked in successfully');
      }
      
      setMarkInDialog(false);
      fetchActiveCheckouts();
    } catch (error) {
      console.error('Failed to mark in:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark in item');
    }
  };

  const isOverdue = (expectedReturn) => {
    return new Date(expectedReturn) < new Date();
  };

  const groupedByProject = checkouts.reduce((acc, checkout) => {
    if (!acc[checkout.project_name]) {
      acc[checkout.project_name] = {
        project_id: checkout.project_id,
        checkouts: []
      };
    }
    acc[checkout.project_name].checkouts.push(checkout);
    return acc;
  }, {});

  const handleGeneratePDF = async (projectId, projectName) => {
    try {
      toast.info('Generating packing list...');
      const response = await axios.get(`${API}/projects/${projectId}/packing-list-pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `packing_list_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Packing list downloaded');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate packing list');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING ACTIVE CHECKOUTS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="items-out-title">
          ITEMS CURRENTLY OUT
        </h1>
        <p className="text-[#A1A1AA] mt-2">{checkouts.length} active checkouts</p>
      </div>

      {Object.keys(groupedByProject).length === 0 ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-sm p-12 text-center" data-testid="no-items-out">
          <PackageOpen size={48} className="mx-auto text-[#71717A] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No items currently out</div>
          <div className="text-[#A1A1AA]">All equipment is in the studio</div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByProject).map(([projectName, projectData]) => (
            <div key={projectName} className="bg-[#27272A] border border-[#3F3F46] rounded-sm p-6" data-testid={`project-group-${projectName}`}>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#3F3F46]">
                <div className="flex-1">
                  <h2 className="font-heading text-2xl font-bold text-white">{projectName}</h2>
                  <div className="text-sm text-[#A1A1AA] mt-1">{projectData.checkouts.length} item(s)</div>
                </div>
                <Button
                  onClick={() => handleGeneratePDF(projectData.project_id, projectName)}
                  data-testid={`generate-pdf-${projectName}`}
                  className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-sm"
                >
                  <FileText size={16} className="mr-2" />
                  Generate Packing List
                </Button>
              </div>
              <div className="space-y-3">
                {projectData.checkouts.map((checkout) => (
                  <div
                    key={checkout.id}
                    data-testid={`checkout-${checkout.id}`}
                    className={`bg-[#1B1B1B] border rounded-sm p-4 flex items-center justify-between ${
                      isOverdue(checkout.expected_return) ? 'border-[#EF4444]' : 'border-[#3F3F46]'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="text-white font-medium text-lg">{checkout.item_name}</div>
                        {isOverdue(checkout.expected_return) && (
                          <span className="bg-red-950/30 text-red-400 border-red-900 border px-2 py-1 rounded-sm text-xs font-mono uppercase tracking-widest flex items-center space-x-1">
                            <AlertTriangle size={12} />
                            <span>OVERDUE</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Quantity Out</div>
                          <div className="text-white font-data font-bold">{checkout.quantity_out}</div>
                        </div>
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Checked Out</div>
                          <div className="text-white">{new Date(checkout.checkout_time).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Expected Return</div>
                          <div className={isOverdue(checkout.expected_return) ? 'text-[#EF4444] font-bold' : 'text-white'}>
                            {new Date(checkout.expected_return).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Notes</div>
                          <div className="text-white">{checkout.notes || 'None'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        onClick={() => openMarkIn(checkout)}
                        data-testid={`mark-in-${checkout.id}`}
                        className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-sm"
                      >
                        Mark In
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={markInDialog} onOpenChange={setMarkInDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-2xl" data-testid="mark-in-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">
              MARK IN: {selectedCheckout?.item_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-[#A1A1AA] text-sm mb-2 block">
                Quantity Out: <span className="text-white font-data font-bold">{selectedCheckout?.quantity_out}</span>
              </Label>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Quantity Returned *</Label>
              <Input
                type="number"
                data-testid="quantity-returned-input"
                min="0"
                max={selectedCheckout?.quantity_out}
                value={markInForm.quantity_returned}
                onChange={(e) => setMarkInForm({...markInForm, quantity_returned: parseInt(e.target.value) || 0})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>

            <div className="bg-[#1B1B1B] border border-[#3F3F46] rounded-sm p-4">
              <Label className="text-white text-sm mb-3 block font-bold">Repack Checklist</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="all-parts"
                    data-testid="check-all-parts"
                    checked={markInForm.repack_checklist.all_parts_present}
                    onCheckedChange={(checked) => 
                      setMarkInForm({
                        ...markInForm,
                        repack_checklist: {...markInForm.repack_checklist, all_parts_present: checked}
                      })
                    }
                    className="border-[#3F3F46] data-[state=checked]:bg-[#F9982E] data-[state=checked]:border-[#F9982E]"
                  />
                  <Label htmlFor="all-parts" className="text-white cursor-pointer">All parts/accessories present</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="batteries"
                    data-testid="check-batteries"
                    checked={markInForm.repack_checklist.batteries_returned}
                    onCheckedChange={(checked) => 
                      setMarkInForm({
                        ...markInForm,
                        repack_checklist: {...markInForm.repack_checklist, batteries_returned: checked}
                      })
                    }
                    className="border-[#3F3F46] data-[state=checked]:bg-[#F9982E] data-[state=checked]:border-[#F9982E]"
                  />
                  <Label htmlFor="batteries" className="text-white cursor-pointer">Batteries returned</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="cables"
                    data-testid="check-cables"
                    checked={markInForm.repack_checklist.cables_included}
                    onCheckedChange={(checked) => 
                      setMarkInForm({
                        ...markInForm,
                        repack_checklist: {...markInForm.repack_checklist, cables_included: checked}
                      })
                    }
                    className="border-[#3F3F46] data-[state=checked]:bg-[#F9982E] data-[state=checked]:border-[#F9982E]"
                  />
                  <Label htmlFor="cables" className="text-white cursor-pointer">All cables included</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="no-damage"
                    data-testid="check-no-damage"
                    checked={markInForm.repack_checklist.no_damage}
                    onCheckedChange={(checked) => 
                      setMarkInForm({
                        ...markInForm,
                        repack_checklist: {...markInForm.repack_checklist, no_damage: checked}
                      })
                    }
                    className="border-[#3F3F46] data-[state=checked]:bg-[#F9982E] data-[state=checked]:border-[#F9982E]"
                  />
                  <Label htmlFor="no-damage" className="text-white cursor-pointer">No visible damage</Label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-white text-sm mb-2 block">Report Issues</Label>
              <div className="flex space-x-2 mb-3">
                <Input
                  data-testid="issue-input"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe any issue..."
                  className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                  onKeyPress={(e) => e.key === 'Enter' && addIssue()}
                />
                <Button
                  onClick={addIssue}
                  data-testid="add-issue-button"
                  className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white rounded-sm"
                >
                  Add Issue
                </Button>
              </div>
              {markInForm.issues.length > 0 && (
                <div className="space-y-2">
                  {markInForm.issues.map((issue, index) => (
                    <div key={index} data-testid={`issue-${index}`} className="bg-[#1B1B1B] border border-[#EF4444] rounded-sm p-3 flex items-center justify-between">
                      <span className="text-white text-sm">{issue}</span>
                      <button
                        onClick={() => removeIssue(index)}
                        data-testid={`remove-issue-${index}`}
                        className="text-[#EF4444] hover:text-[#EF4444]/80 text-xs font-bold"
                      >
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-white text-sm mb-2 block">Notes (Optional)</Label>
              <Input
                data-testid="mark-in-notes"
                value={markInForm.notes}
                onChange={(e) => setMarkInForm({...markInForm, notes: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setMarkInDialog(false)}
              data-testid="cancel-mark-in"
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkIn}
              data-testid="confirm-mark-in"
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-sm"
            >
              Confirm Mark In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}