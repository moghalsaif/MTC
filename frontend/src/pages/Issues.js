import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Plus, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addIssueDialog, setAddIssueDialog] = useState(false);
  const [newIssueForm, setNewIssueForm] = useState({
    item_id: '',
    description: '',
    severity: 'Medium',
    assigned_to: ''
  });

  useEffect(() => {
    fetchIssues();
    fetchItems();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await axios.get(`${API}/issues`);
      setIssues(response.data);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      toast.error('Failed to load issues');
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

  const handleAddIssue = async () => {
    if (!newIssueForm.item_id || !newIssueForm.description) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/issues`, newIssueForm);
      toast.success('Issue reported successfully');
      setAddIssueDialog(false);
      setNewIssueForm({
        item_id: '',
        description: '',
        severity: 'Medium',
        assigned_to: ''
      });
      fetchIssues();
    } catch (error) {
      console.error('Failed to create issue:', error);
      toast.error('Failed to report issue');
    }
  };

  const resolveIssue = async (issueId) => {
    try {
      await axios.patch(`${API}/issues/${issueId}`, null, {
        params: { status: 'Resolved' }
      });
      toast.success('Issue resolved');
      fetchIssues();
    } catch (error) {
      console.error('Failed to resolve issue:', error);
      toast.error('Failed to resolve issue');
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      'Low': 'bg-blue-950/30 text-blue-400 border-blue-900',
      'Medium': 'bg-amber-950/30 text-amber-400 border-amber-900',
      'High': 'bg-orange-950/30 text-orange-400 border-orange-900',
      'Critical': 'bg-red-950/30 text-red-400 border-red-900'
    };
    return badges[severity] || 'bg-[#3F3F46] text-white border-[#3F3F46]';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Open': 'bg-red-950/30 text-red-400 border-red-900',
      'In Progress': 'bg-amber-950/30 text-amber-400 border-amber-900',
      'Resolved': 'bg-emerald-950/30 text-emerald-400 border-emerald-900'
    };
    return badges[status] || 'bg-[#3F3F46] text-white border-[#3F3F46]';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING ISSUES...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="issues-title">
            ISSUES
          </h1>
          <p className="text-[#A1A1AA] mt-2">{issues.filter(i => i.status !== 'Resolved').length} open issues</p>
        </div>
        <Button
          onClick={() => setAddIssueDialog(true)}
          data-testid="report-issue-button"
          className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
        >
          <Plus size={18} className="mr-2" />
          Report Issue
        </Button>
      </div>

      {issues.length === 0 ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-12 text-center" data-testid="no-issues">
          <CheckCircle size={48} className="mx-auto text-[#10B981] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No issues reported</div>
          <div className="text-[#A1A1AA]">All equipment is in good condition</div>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              data-testid={`issue-${issue.id}`}
              className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <AlertTriangle className="text-[#F59E0B]" size={20} />
                    <h3 className="text-white font-heading text-xl font-bold">{issue.item_name}</h3>
                    <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-2xl border ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-2xl border ${getStatusBadge(issue.status)}`}>
                      {issue.status}
                    </span>
                  </div>
                  <p className="text-[#A1A1AA] mb-3">{issue.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Reported</div>
                      <div className="text-white">{new Date(issue.created_at).toLocaleDateString()}</div>
                    </div>
                    {issue.assigned_to && (
                      <div>
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Assigned To</div>
                        <div className="text-white">{issue.assigned_to}</div>
                      </div>
                    )}
                    {issue.resolved_at && (
                      <div>
                        <div className="text-[#71717A] text-xs uppercase tracking-wider mb-1">Resolved</div>
                        <div className="text-white">{new Date(issue.resolved_at).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
                {issue.status !== 'Resolved' && (
                  <Button
                    onClick={() => resolveIssue(issue.id)}
                    data-testid={`resolve-issue-${issue.id}`}
                    className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold uppercase tracking-wider rounded-2xl ml-4"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addIssueDialog} onOpenChange={setAddIssueDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="add-issue-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">REPORT ISSUE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white text-sm mb-2 block">Item *</Label>
              <Select value={newIssueForm.item_id} onValueChange={(val) => setNewIssueForm({...newIssueForm, item_id: val})}>
                <SelectTrigger data-testid="issue-item-select" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
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
              <Label className="text-white text-sm mb-2 block">Description *</Label>
              <Input
                data-testid="issue-description-input"
                value={newIssueForm.description}
                onChange={(e) => setNewIssueForm({...newIssueForm, description: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                placeholder="What's wrong with this item?"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Severity</Label>
              <Select value={newIssueForm.severity} onValueChange={(val) => setNewIssueForm({...newIssueForm, severity: val})}>
                <SelectTrigger data-testid="issue-severity-select" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Assign To</Label>
              <Input
                data-testid="issue-assignee-input"
                value={newIssueForm.assigned_to}
                onChange={(e) => setNewIssueForm({...newIssueForm, assigned_to: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
                placeholder="Technician name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setAddIssueDialog(false)}
              data-testid="cancel-issue"
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddIssue}
              data-testid="confirm-issue"
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
            >
              Report Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}