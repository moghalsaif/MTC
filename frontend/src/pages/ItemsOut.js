import { useState, useEffect } from 'react';
import axios from 'axios';
import { PackageOpen, AlertTriangle, FileText, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ItemsOut() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const response = await axios.get(`${API}/checkouts/active`);
      const projectCheckouts = response.data.filter(c => c.project_id === projectId);
      setCheckouts(projectCheckouts);
    } catch (error) {
      console.error('Failed to fetch checkouts:', error);
      toast.error('Failed to load items for this project');
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
      
      fetchCheckoutsForProject(selectedProjectId);
    } catch (error) {
      console.error('Failed to mark in:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark in item');
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

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isPacking = checkouts.length > 0 && checkouts[0]?.packing_start_time;
  const elapsedTime = isPacking ? getElapsedTime(checkouts[0].packing_start_time) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-foreground font-data">LOADING PROJECTS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl font-black text-foreground tracking-tight" data-testid="items-out-title">
          WRAP-UP CENTER
        </h1>
        <p className="text-muted-foreground mt-2">Select a project to view and pack items</p>
      </div>

      {/* Project Selector */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <label className="text-sm font-medium text-foreground mb-2 block">SELECT PROJECT</label>
            <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
              <SelectTrigger data-testid="project-selector" className="bg-background border-border text-foreground h-12 rounded-xl">
                <SelectValue placeholder="Choose a project to view items..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-xs text-muted-foreground ml-4">
                        {project.status === 'Active' ? '🟢 Active' : '🟡 Planning'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProject && checkouts.length > 0 && (
            <div className="flex items-center space-x-4">
              {isPacking && elapsedTime && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-4 py-2 rounded-2xl flex items-center space-x-2">
                  <Clock size={16} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-data text-sm font-bold">{elapsedTime} ELAPSED</span>
                </div>
              )}
              <Button
                onClick={handleGeneratePDF}
                data-testid="generate-pdf"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider rounded-2xl shadow-lg"
              >
                <FileText size={16} className="mr-2" />
                Packing List PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <PackageOpen size={48} className="mx-auto text-muted-foreground mb-4" />
          <div className="text-foreground text-lg font-medium mb-2">Select a project to get started</div>
          <div className="text-muted-foreground">Choose a project from the dropdown above to view items that need packing</div>
        </div>
      ) : checkouts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center" data-testid="no-items-out">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
          <div className="text-foreground text-lg font-medium mb-2">All items returned</div>
          <div className="text-muted-foreground">No items currently out for {selectedProject?.name}</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">{selectedProject?.name}</h2>
                <div className="text-sm text-muted-foreground mt-1">{checkouts.length} item(s) to pack</div>
              </div>
            </div>

            {isPacking && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <Clock className="text-emerald-600 dark:text-emerald-400 mt-0.5 animate-pulse" size={20} />
                  <div className="text-sm text-emerald-700 dark:text-emerald-300">
                    <strong>Timer started automatically!</strong> Mark each item as you pack it. Packing time is being tracked.
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {checkouts.map((checkout) => (
                <div
                  key={checkout.id}
                  data-testid={`checkout-${checkout.id}`}
                  className={`bg-background border rounded-2xl p-5 transition-colors ${
                    isOverdue(checkout.expected_return) 
                      ? 'border-destructive' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-foreground font-medium text-lg">{checkout.item_name}</div>
                        {isOverdue(checkout.expected_return) && (
                          <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 border px-2 py-1 rounded-2xl text-xs font-mono uppercase tracking-widest flex items-center space-x-1">
                            <AlertTriangle size={12} />
                            <span>OVERDUE</span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Quantity Out</div>
                          <div className="text-foreground font-data font-bold text-lg">{checkout.quantity_out}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Expected Return</div>
                          <div className={isOverdue(checkout.expected_return) ? 'text-destructive font-bold' : 'text-foreground'}>
                            {new Date(checkout.expected_return).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Notes</div>
                          <div className="text-foreground">{checkout.notes || 'None'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-6 flex flex-col space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quick Mark In:</div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleQuickMarkIn(checkout.id, 'good')}
                          data-testid={`mark-in-good-${checkout.id}`}
                          className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                          title="Item returned in good condition"
                        >
                          <CheckCircle2 size={16} />
                          <span>All Good</span>
                        </button>
                        <button
                          onClick={() => handleQuickMarkIn(checkout.id, 'damaged')}
                          data-testid={`mark-in-damaged-${checkout.id}`}
                          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                          title="Item has damage - will create issue"
                        >
                          <AlertCircle size={16} />
                          <span>Damaged</span>
                        </button>
                        <button
                          onClick={() => handleQuickMarkIn(checkout.id, 'missing')}
                          data-testid={`mark-in-missing-${checkout.id}`}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg"
                          title="Item not returned - will mark as lost"
                        >
                          <XCircle size={16} />
                          <span>Missing</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
