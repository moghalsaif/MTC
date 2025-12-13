import { useState, useEffect } from 'react';
import axios from 'axios';
import { PackageOpen, AlertTriangle, FileText, Clock, CheckCircle2, XCircle, AlertCircle, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ItemsOut() {
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [packingStats, setPackingStats] = useState({});
  const [packingInProgress, setPackingInProgress] = useState({});

  useEffect(() => {
    fetchActiveCheckouts();
  }, []);

  const fetchActiveCheckouts = async () => {
    try {
      const response = await axios.get(`${API}/checkouts/active`);
      setCheckouts(response.data);
      
      const inProgress = {};
      response.data.forEach(checkout => {
        if (checkout.packing_start_time && !checkout.packing_complete_time) {
          inProgress[checkout.project_id] = true;
        }
      });
      setPackingInProgress(inProgress);
    } catch (error) {
      console.error('Failed to fetch checkouts:', error);
      toast.error('Failed to load items out');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPacking = async (projectId) => {
    try {
      await axios.post(`${API}/checkouts/start-packing`, { project_id: projectId });
      toast.success('Packing timer started! Mark items as you pack them.');
      setPackingInProgress({...packingInProgress, [projectId]: true});
      fetchActiveCheckouts();
    } catch (error) {
      console.error('Failed to start packing:', error);
      toast.error('Failed to start packing timer');
    }
  };

  const handleQuickMarkIn = async (checkoutId, condition) => {
    try {
      const response = await axios.post(`${API}/checkouts/quick-mark-in`, {
        checkout_id: checkoutId,
        condition: condition
      });
      
      const duration = response.data.packing_duration_minutes;
      if (duration) {
        toast.success(`Marked in! Packing time: ${duration} min`);
      } else {
        toast.success('Item marked in successfully');
      }
      
      fetchActiveCheckouts();
    } catch (error) {
      console.error('Failed to mark in:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark in item');
    }
  };

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

  const fetchPackingStats = async (projectId) => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}/packing-stats`);
      setPackingStats({...packingStats, [projectId]: response.data});
    } catch (error) {
      console.error('Failed to fetch packing stats:', error);
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
          WRAP-UP CENTER
        </h1>
        <p className="text-[#A1A1AA] mt-2">{checkouts.length} item(s) to pack and return</p>
      </div>

      {Object.keys(groupedByProject).length === 0 ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-12 text-center" data-testid="no-items-out">
          <PackageOpen size={48} className="mx-auto text-[#71717A] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No items currently out</div>
          <div className="text-[#A1A1AA]">All equipment is in the studio</div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByProject).map(([projectName, projectData]) => {
            const isPacking = packingInProgress[projectData.project_id];
            const firstCheckout = projectData.checkouts[0];
            const elapsedTime = isPacking && firstCheckout?.packing_start_time ? 
              getElapsedTime(firstCheckout.packing_start_time) : null;
            
            return (
              <div key={projectName} className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6" data-testid={`project-group-${projectName}`}>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#3F3F46]">
                  <div className="flex-1">
                    <h2 className="font-heading text-2xl font-bold text-white mb-2">{projectName}</h2>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-[#A1A1AA]">{projectData.checkouts.length} item(s)</span>
                      {isPacking && elapsedTime && (
                        <span className="flex items-center space-x-2 text-[#F9982E] font-data font-bold">
                          <Clock size={16} className="animate-pulse" />
                          <span>{elapsedTime} elapsed</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    {!isPacking ? (
                      <Button
                        onClick={() => handleStartPacking(projectData.project_id)}
                        data-testid={`start-packing-${projectName}`}
                        className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold uppercase tracking-wider rounded-2xl"
                      >
                        <Play size={16} className="mr-2" />
                        Start Packing
                      </Button>
                    ) : (
                      <div className="bg-emerald-950/30 border border-emerald-900 px-4 py-2 rounded-2xl">
                        <span className="text-emerald-400 font-data text-sm">PACKING IN PROGRESS</span>
                      </div>
                    )}
                    <Button
                      onClick={() => handleGeneratePDF(projectData.project_id, projectName)}
                      data-testid={`generate-pdf-${projectName}`}
                      className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
                    >
                      <FileText size={16} className="mr-2" />
                      Packing List PDF
                    </Button>
                  </div>
                </div>

                {!isPacking && (
                  <div className="bg-blue-950/30 border border-blue-900 rounded-2xl p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="text-blue-400 mt-0.5" size={20} />
                      <div className="text-sm text-blue-300">
                        <strong>Click "Start Packing"</strong> to begin tracking packing time. Then mark each item as you pack it.
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {projectData.checkouts.map((checkout) => (
                    <div
                      key={checkout.id}
                      data-testid={`checkout-${checkout.id}`}
                      className={`bg-[#1B1B1B] border rounded-2xl p-5 ${
                        isOverdue(checkout.expected_return) ? 'border-[#EF4444]' : 'border-[#3F3F46]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="text-white font-medium text-lg">{checkout.item_name}</div>
                            {isOverdue(checkout.expected_return) && (
                              <span className="bg-red-950/30 text-red-400 border-red-900 border px-2 py-1 rounded-2xl text-xs font-mono uppercase tracking-widest flex items-center space-x-1">
                                <AlertTriangle size={12} />
                                <span>OVERDUE</span>
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Quantity Out</div>
                              <div className="text-white font-data font-bold text-lg">{checkout.quantity_out}</div>
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

                        {isPacking && (
                          <div className="ml-6 flex flex-col space-y-2">
                            <div className="text-xs text-[#71717A] uppercase tracking-wider mb-1">Quick Mark In:</div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleQuickMarkIn(checkout.id, 'good')}
                                data-testid={`mark-in-good-${checkout.id}`}
                                className="flex items-center space-x-2 px-4 py-2 bg-[#10B981] hover:bg-[#10B981]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors"
                                title="Item returned in good condition"
                              >
                                <CheckCircle2 size={16} />
                                <span>All Good</span>
                              </button>
                              <button
                                onClick={() => handleQuickMarkIn(checkout.id, 'damaged')}
                                data-testid={`mark-in-damaged-${checkout.id}`}
                                className="flex items-center space-x-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors"
                                title="Item has damage - will create issue"
                              >
                                <AlertCircle size={16} />
                                <span>Damaged</span>
                              </button>
                              <button
                                onClick={() => handleQuickMarkIn(checkout.id, 'missing')}
                                data-testid={`mark-in-missing-${checkout.id}`}
                                className="flex items-center space-x-2 px-4 py-2 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors"
                                title="Item not returned - will mark as lost"
                              >
                                <XCircle size={16} />
                                <span>Missing</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {packingStats[projectData.project_id] && packingStats[projectData.project_id].total_items > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#3F3F46]">
                    <h3 className="text-white font-heading text-lg font-bold mb-4">PACKING PERFORMANCE</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-[#1B1B1B] border border-[#3F3F46] rounded-2xl p-4">
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-2">Total Time</div>
                        <div className="text-white font-data font-bold text-2xl">
                          {Math.floor(packingStats[projectData.project_id].total_time_minutes / 60)}h {packingStats[projectData.project_id].total_time_minutes % 60}m
                        </div>
                      </div>
                      <div className="bg-[#1B1B1B] border border-[#3F3F46] rounded-2xl p-4">
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-2">Average per Item</div>
                        <div className="text-white font-data font-bold text-2xl">
                          {packingStats[projectData.project_id].average_time_minutes}m
                        </div>
                      </div>
                      <div className="bg-[#1B1B1B] border border-[#3F3F46] rounded-2xl p-4">
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-2">Fastest</div>
                        <div className="text-emerald-400 font-data font-bold text-sm">
                          {packingStats[projectData.project_id].fastest_item?.time_minutes}m
                        </div>
                        <div className="text-[#71717A] text-xs truncate">
                          {packingStats[projectData.project_id].fastest_item?.name}
                        </div>
                      </div>
                      <div className="bg-[#1B1B1B] border border-[#3F3F46] rounded-2xl p-4">
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-2">Slowest</div>
                        <div className="text-orange-400 font-data font-bold text-sm">
                          {packingStats[projectData.project_id].slowest_item?.time_minutes}m
                        </div>
                        <div className="text-[#71717A] text-xs truncate">
                          {packingStats[projectData.project_id].slowest_item?.name}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
