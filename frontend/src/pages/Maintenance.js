import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wrench, Plus, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Maintenance() {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMaintenanceDialog, setAddMaintenanceDialog] = useState(false);
  const [newMaintenanceForm, setNewMaintenanceForm] = useState({
    item_id: '',
    maintenance_type: '',
    technician: '',
    notes: ''
  });

  useEffect(() => {
    fetchMaintenance();
    fetchItems();
  }, []);

  const fetchMaintenance = async () => {
    try {
      const response = await axios.get(`${API}/maintenance`);
      setMaintenanceRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch maintenance:', error);
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/items`);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const handleAddMaintenance = async () => {
    if (!newMaintenanceForm.item_id || !newMaintenanceForm.maintenance_type) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/maintenance`, newMaintenanceForm);
      toast.success('Maintenance record created');
      setAddMaintenanceDialog(false);
      setNewMaintenanceForm({
        item_id: '',
        maintenance_type: '',
        technician: '',
        notes: ''
      });
      fetchMaintenance();
    } catch (error) {
      console.error('Failed to create maintenance:', error);
      toast.error('Failed to create maintenance record');
    }
  };

  const completeMaintenance = async (maintenanceId) => {
    try {
      await axios.patch(`${API}/maintenance/${maintenanceId}`);
      toast.success('Maintenance completed');
      fetchMaintenance();
    } catch (error) {
      console.error('Failed to complete maintenance:', error);
      toast.error('Failed to complete maintenance');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'In Progress': 'bg-amber-950/30 text-amber-400 border-amber-900',
      'Completed': 'bg-emerald-950/30 text-emerald-400 border-emerald-900'
    };
    return badges[status] || 'bg-[#3F3F46] text-white border-[#3F3F46]';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING MAINTENANCE RECORDS...</div>
      </div>
    );
  }

  const inProgress = maintenanceRecords.filter(m => m.status === 'In Progress');
  const completed = maintenanceRecords.filter(m => m.status === 'Completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="maintenance-title">
            MAINTENANCE
          </h1>
          <p className="text-[#A1A1AA] mt-2">{inProgress.length} in progress, {completed.length} completed</p>
        </div>
        <Button
          onClick={() => setAddMaintenanceDialog(true)}
          data-testid="start-maintenance-button"
          className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-sm"
        >
          <Plus size={18} className="mr-2" />
          Start Maintenance
        </Button>
      </div>

      {maintenanceRecords.length === 0 ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-sm p-12 text-center" data-testid="no-maintenance">
          <CheckCircle size={48} className="mx-auto text-[#10B981] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No maintenance records</div>
          <div className="text-[#A1A1AA]">All equipment is in working condition</div>
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-white">IN PROGRESS</h2>
              {inProgress.map((record) => (
                <div
                  key={record.id}
                  data-testid={`maintenance-${record.id}`}
                  className="bg-[#27272A] border border-[#F59E0B] rounded-sm p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Wrench className="text-[#F59E0B]" size={20} />
                        <h3 className="text-white font-heading text-xl font-bold">{record.item_name}</h3>
                        <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-sm border ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Type</div>
                          <div className="text-white">{record.maintenance_type}</div>
                        </div>
                        <div>
                          <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Started</div>
                          <div className="text-white">{new Date(record.start_date).toLocaleDateString()}</div>
                        </div>
                        {record.technician && (
                          <div>
                            <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Technician</div>
                            <div className="text-white">{record.technician}</div>
                          </div>
                        )}
                        {record.notes && (
                          <div>
                            <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Notes</div>
                            <div className="text-white">{record.notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => completeMaintenance(record.id)}
                      data-testid={`complete-maintenance-${record.id}`}
                      className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold uppercase tracking-wider rounded-sm ml-4"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-white">COMPLETED</h2>
              {completed.map((record) => (
                <div
                  key={record.id}
                  data-testid={`completed-maintenance-${record.id}`}
                  className="bg-[#27272A] border border-[#3F3F46] rounded-sm p-6 opacity-60"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle className="text-[#10B981]" size={20} />
                    <h3 className="text-white font-heading text-xl font-bold">{record.item_name}</h3>
                    <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-sm border ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Type</div>
                      <div className="text-white">{record.maintenance_type}</div>
                    </div>
                    <div>
                      <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Started</div>
                      <div className="text-white">{new Date(record.start_date).toLocaleDateString()}</div>
                    </div>
                    {record.completion_date && (
                      <div>
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Completed</div>
                        <div className="text-white">{new Date(record.completion_date).toLocaleDateString()}</div>
                      </div>
                    )}
                    {record.technician && (
                      <div>
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Technician</div>
                        <div className="text-white">{record.technician}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={addMaintenanceDialog} onOpenChange={setAddMaintenanceDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="add-maintenance-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">START MAINTENANCE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white text-sm mb-2 block">Item *</Label>
              <Select value={newMaintenanceForm.item_id} onValueChange={(val) => setNewMaintenanceForm({...newMaintenanceForm, item_id: val})}>
                <SelectTrigger data-testid="maintenance-item-select" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Maintenance Type *</Label>
              <Select value={newMaintenanceForm.maintenance_type} onValueChange={(val) => setNewMaintenanceForm({...newMaintenanceForm, maintenance_type: val})}>
                <SelectTrigger data-testid="maintenance-type-select" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="Repair">Repair</SelectItem>
                  <SelectItem value="Calibration">Calibration</SelectItem>
                  <SelectItem value="Firmware Update">Firmware Update</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Technician</Label>
              <Input
                data-testid="technician-input"
                value={newMaintenanceForm.technician}
                onChange={(e) => setNewMaintenanceForm({...newMaintenanceForm, technician: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                placeholder="Technician name"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Notes</Label>
              <Input
                data-testid="maintenance-notes-input"
                value={newMaintenanceForm.notes}
                onChange={(e) => setNewMaintenanceForm({...newMaintenanceForm, notes: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                placeholder="Additional details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setAddMaintenanceDialog(false)}
              data-testid="cancel-maintenance"
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMaintenance}
              data-testid="confirm-maintenance"
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-sm"
            >
              Start Maintenance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}