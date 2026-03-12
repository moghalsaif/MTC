import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Plus, CheckCircle, Mail, User, Wrench, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ISSUE_TYPES = ['Damage', 'Malfunction', 'Missing Part', 'Calibration', 'Other'];

export default function Issues() {
  const { canResolveIssues } = useAuth();
  const [issues, setIssues] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addIssueDialog, setAddIssueDialog] = useState(false);
  const [editIssueDialog, setEditIssueDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [newIssueForm, setNewIssueForm] = useState({
    item_id: '', description: '', issue_type: 'Damage', severity: 'Medium',
    reported_by: '', reported_by_email: '', assigned_to: '', assigned_to_email: '', vendor_contact: ''
  });
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchIssues(); fetchItems(); }, []);

  const fetchIssues = async () => {
    try { setIssues((await axios.get(`${API}/issues`)).data); }
    catch { toast.error('Failed to load issues'); }
    finally { setLoading(false); }
  };

  const fetchItems = async () => {
    try { setItems((await axios.get(`${API}/items`)).data); }
    catch { console.error('Failed to fetch items'); }
  };

  const handleAddIssue = async () => {
    if (!newIssueForm.item_id || !newIssueForm.description) { toast.error('Select item and describe the issue'); return; }
    try {
      await axios.post(`${API}/issues`, newIssueForm);
      toast.success('Issue reported');
      setAddIssueDialog(false);
      setNewIssueForm({ item_id: '', description: '', issue_type: 'Damage', severity: 'Medium', reported_by: '', reported_by_email: '', assigned_to: '', assigned_to_email: '', vendor_contact: '' });
      fetchIssues();
      fetchItems();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to report issue'); }
  };

  const openEditIssue = (issue) => {
    setSelectedIssue(issue);
    setEditForm({
      description: issue.description || '', issue_type: issue.issue_type || 'Damage',
      severity: issue.severity || 'Medium', status: issue.status || 'Open',
      assigned_to: issue.assigned_to || '', assigned_to_email: issue.assigned_to_email || '',
      vendor_contact: issue.vendor_contact || '', resolution_notes: issue.resolution_notes || ''
    });
    setEditIssueDialog(true);
  };

  const handleEditIssue = async () => {
    try {
      await axios.patch(`${API}/issues/${selectedIssue.id}`, editForm);
      toast.success('Issue updated');
      setEditIssueDialog(false);
      fetchIssues();
      fetchItems();
    } catch (e) { toast.error('Failed to update issue'); }
  };

  const resolveIssue = async (issue) => {
    try {
      await axios.patch(`${API}/issues/${issue.id}`, { status: 'Resolved', resolution_notes: 'Resolved' });
      toast.success(`Issue resolved — ${issue.item_name} set back to OK`);
      fetchIssues();
      fetchItems();
    } catch { toast.error('Failed to resolve issue'); }
  };

  const filteredIssues = issues.filter(i => {
    const matchStatus = filterStatus === 'all' || (filterStatus === 'open' ? i.status !== 'Resolved' : i.status === 'Resolved');
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || i.item_name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s) || (i.assigned_to || '').toLowerCase().includes(s);
    return matchStatus && matchSearch;
  });

  const openCount = issues.filter(i => i.status !== 'Resolved').length;

  const sevBadge = (sev) => ({
    'Low': 'bg-blue-950/40 text-blue-400 border-blue-900/50',
    'Medium': 'bg-amber-950/40 text-amber-400 border-amber-900/50',
    'High': 'bg-orange-950/40 text-orange-400 border-orange-900/50',
    'Critical': 'bg-red-950/40 text-red-400 border-red-900/50',
  }[sev] || 'bg-[#232328] text-[#71717A] border-[#232328]');

  const statusBadge = (st) => ({
    'Open': 'bg-red-950/40 text-red-400 border-red-900/50',
    'In Progress': 'bg-amber-950/40 text-amber-400 border-amber-900/50',
    'Resolved': 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50',
  }[st] || 'bg-[#232328] text-[#71717A] border-[#232328]');

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-[#52525B] font-data text-sm">LOADING ISSUES...</div></div>;

  return (
    <div className="space-y-6" data-testid="issues-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight" data-testid="issues-title">ISSUES</h1>
          <p className="text-[#52525B] mt-1 text-sm">{openCount} open issues</p>
        </div>
        <Button onClick={() => setAddIssueDialog(true)} data-testid="report-issue-button" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg text-xs">
          <Plus size={16} className="mr-1.5" />Report Issue
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3F3F46]" size={16} />
          <Input placeholder="Search issues..." data-testid="issues-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-[#18181B] border-[#232328] focus:border-[#F9982E] text-white h-10 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger data-testid="issues-status-filter" className="bg-[#18181B] border-[#232328] text-white h-10 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="open">Open</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
        </Select>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="bg-[#18181B] border border-[#232328] rounded-lg p-12 text-center" data-testid="no-issues">
          <CheckCircle size={40} className="mx-auto text-[#232328] mb-3" />
          <p className="text-[#3F3F46] text-sm">{openCount === 0 ? 'No open issues. All equipment is in good condition.' : 'No issues match your filter.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIssues.map(issue => {
            const isExpanded = expandedId === issue.id;
            return (
              <div key={issue.id} data-testid={`issue-${issue.id}`} className="bg-[#18181B] border border-[#232328] rounded-lg overflow-hidden transition-all">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1C1C1F]" onClick={() => setExpandedId(isExpanded ? null : issue.id)}>
                  <AlertTriangle size={16} className={issue.severity === 'Critical' ? 'text-[#EF4444]' : issue.severity === 'High' ? 'text-[#F97316]' : 'text-[#F59E0B]'} />
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-medium">{issue.item_name}</span>
                    <span className="text-[#3F3F46] text-xs ml-2">{issue.issue_type || 'Damage'}</span>
                  </div>
                  <span className={`font-data text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${sevBadge(issue.severity)}`}>{issue.severity}</span>
                  <span className={`font-data text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${statusBadge(issue.status)}`}>{issue.status}</span>
                  <span className="text-[10px] text-[#3F3F46] font-data">{new Date(issue.created_at).toLocaleDateString()}</span>
                  {isExpanded ? <ChevronUp size={14} className="text-[#3F3F46]" /> : <ChevronDown size={14} className="text-[#3F3F46]" />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[#232328] px-4 py-4 bg-[#0F0F0F]/50">
                    <p className="text-[#A1A1AA] text-sm mb-4">{issue.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {issue.reported_by && (
                        <div><div className="text-[10px] text-[#3F3F46] uppercase tracking-wider mb-1">Reported By</div>
                          <div className="text-white text-sm flex items-center gap-1"><User size={12} className="text-[#52525B]" />{issue.reported_by}</div>
                          {issue.reported_by_email && <div className="text-[10px] text-[#52525B] flex items-center gap-1 mt-0.5"><Mail size={10} />{issue.reported_by_email}</div>}
                        </div>
                      )}
                      {issue.assigned_to && (
                        <div><div className="text-[10px] text-[#3F3F46] uppercase tracking-wider mb-1">Assigned To</div>
                          <div className="text-white text-sm flex items-center gap-1"><Wrench size={12} className="text-[#52525B]" />{issue.assigned_to}</div>
                          {issue.assigned_to_email && <div className="text-[10px] text-[#52525B] flex items-center gap-1 mt-0.5"><Mail size={10} />{issue.assigned_to_email}</div>}
                        </div>
                      )}
                      {issue.vendor_contact && (
                        <div><div className="text-[10px] text-[#3F3F46] uppercase tracking-wider mb-1">Vendor Contact</div>
                          <div className="text-white text-sm">{issue.vendor_contact}</div>
                        </div>
                      )}
                      {issue.resolved_at && (
                        <div><div className="text-[10px] text-[#3F3F46] uppercase tracking-wider mb-1">Resolved</div>
                          <div className="text-emerald-400 text-sm font-data">{new Date(issue.resolved_at).toLocaleDateString()}</div>
                          {issue.resolution_notes && <div className="text-[10px] text-[#52525B] mt-0.5">{issue.resolution_notes}</div>}
                        </div>
                      )}
                    </div>
                    {issue.status !== 'Resolved' && (
                      <div className="flex gap-2">
                        <Button onClick={() => openEditIssue(issue)} data-testid={`edit-issue-${issue.id}`} className="bg-transparent border border-[#232328] text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1F] rounded-lg text-xs font-bold">Edit Details</Button>
                        {canResolveIssues && <Button onClick={() => resolveIssue(issue)} data-testid={`resolve-issue-${issue.id}`} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
                          <CheckCircle size={14} className="mr-1" />Resolve
                        </Button>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Report Issue Dialog */}
      <Dialog open={addIssueDialog} onOpenChange={setAddIssueDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-lg max-h-[85vh] overflow-y-auto" data-testid="add-issue-dialog">
          <DialogHeader><DialogTitle className="font-heading text-xl font-bold">REPORT ISSUE</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-white text-sm mb-2 block">Item *</Label>
              <Select value={newIssueForm.item_id} onValueChange={(v) => setNewIssueForm({ ...newIssueForm, item_id: v })}>
                <SelectTrigger data-testid="issue-item-select" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#232328]">{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.category})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-white text-sm mb-2 block">Description *</Label>
              <Input data-testid="issue-description-input" value={newIssueForm.description} onChange={(e) => setNewIssueForm({ ...newIssueForm, description: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="What's wrong?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Issue Type</Label>
                <Select value={newIssueForm.issue_type} onValueChange={(v) => setNewIssueForm({ ...newIssueForm, issue_type: v })}>
                  <SelectTrigger data-testid="issue-type-select" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">{ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-white text-sm mb-2 block">Severity</Label>
                <Select value={newIssueForm.severity} onValueChange={(v) => setNewIssueForm({ ...newIssueForm, severity: v })}>
                  <SelectTrigger data-testid="issue-severity-select" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1"><div className="h-px flex-1 bg-[#232328]" /><span className="text-[10px] text-[#3F3F46] uppercase tracking-widest">People</span><div className="h-px flex-1 bg-[#232328]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Reported By</Label><Input data-testid="issue-reporter-input" value={newIssueForm.reported_by} onChange={(e) => setNewIssueForm({ ...newIssueForm, reported_by: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="Your name" /></div>
              <div><Label className="text-white text-sm mb-2 block">Reporter Email</Label><Input data-testid="issue-reporter-email" value={newIssueForm.reported_by_email} onChange={(e) => setNewIssueForm({ ...newIssueForm, reported_by_email: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="you@machvisuals.com" /></div>
              <div><Label className="text-white text-sm mb-2 block">Assign To</Label><Input data-testid="issue-assignee-input" value={newIssueForm.assigned_to} onChange={(e) => setNewIssueForm({ ...newIssueForm, assigned_to: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="Technician name" /></div>
              <div><Label className="text-white text-sm mb-2 block">Assignee Email</Label><Input data-testid="issue-assignee-email" value={newIssueForm.assigned_to_email} onChange={(e) => setNewIssueForm({ ...newIssueForm, assigned_to_email: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="tech@machvisuals.com" /></div>
            </div>
            <div><Label className="text-white text-sm mb-2 block">Vendor / Service Contact</Label><Input data-testid="issue-vendor-input" value={newIssueForm.vendor_contact} onChange={(e) => setNewIssueForm({ ...newIssueForm, vendor_contact: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. Blackmagic Support — support@blackmagicdesign.com" /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAddIssueDialog(false)} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">Cancel</Button>
            <Button onClick={handleAddIssue} data-testid="confirm-issue" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">Report Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Issue Dialog */}
      <Dialog open={editIssueDialog} onOpenChange={setEditIssueDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-lg" data-testid="edit-issue-dialog">
          <DialogHeader><DialogTitle className="font-heading text-xl font-bold">EDIT: {selectedIssue?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-white text-sm mb-2 block">Description</Label><Input value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Type</Label>
                <Select value={editForm.issue_type || 'Damage'} onValueChange={(v) => setEditForm({ ...editForm, issue_type: v })}>
                  <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">{ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-white text-sm mb-2 block">Severity</Label>
                <Select value={editForm.severity || 'Medium'} onValueChange={(v) => setEditForm({ ...editForm, severity: v })}>
                  <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-white text-sm mb-2 block">Status</Label>
                <Select value={editForm.status || 'Open'} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Resolved">Resolved</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white text-sm mb-2 block">Assigned To</Label><Input value={editForm.assigned_to || ''} onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
              <div><Label className="text-white text-sm mb-2 block">Assignee Email</Label><Input value={editForm.assigned_to_email || ''} onChange={(e) => setEditForm({ ...editForm, assigned_to_email: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
            </div>
            <div><Label className="text-white text-sm mb-2 block">Vendor Contact</Label><Input value={editForm.vendor_contact || ''} onChange={(e) => setEditForm({ ...editForm, vendor_contact: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" /></div>
            <div><Label className="text-white text-sm mb-2 block">Resolution Notes</Label><Input value={editForm.resolution_notes || ''} onChange={(e) => setEditForm({ ...editForm, resolution_notes: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="What was done to fix it?" /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditIssueDialog(false)} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">Cancel</Button>
            <Button onClick={handleEditIssue} data-testid="confirm-edit-issue" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
