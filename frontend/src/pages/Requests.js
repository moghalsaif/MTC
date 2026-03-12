import { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardList, Plus, ExternalLink, Clock, CheckCircle, XCircle, PauseCircle, ChevronDown, ChevronUp, Image, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;
const CATEGORIES = ['Asset', 'Tool', 'Licence', 'Subscription'];
const STATUS_STYLES = {
  Pending: { icon: Clock, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  Approved: { icon: CheckCircle, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Rejected: { icon: XCircle, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  'On Hold': { icon: PauseCircle, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

function getMinDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export default function Requests() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showApproval, setShowApproval] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ item_name: '', category: 'Tool', product_url: '', justification: '', l1_price: '', negotiation_notes: '', needed_by_date: getMinDate() });
  const [photo, setPhoto] = useState(null);

  const [approval, setApproval] = useState({ status: '', rejection_reason: '', vendor_name: '', vendor_contact: '', best_price: '', registered_company_confirmed: false });

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get(`${API}/api/requests`);
      setRequests(data);
    } catch (e) { toast.error('Failed to load requests'); }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lines = form.justification.trim().split('\n').filter(l => l.trim());
    if (lines.length < 3) { toast.error('Justification must have at least 3 lines'); return; }
    if (!photo) { toast.error('Photo attachment is required'); return; }
    if (!form.product_url.trim()) { toast.error('Product URL is required'); return; }

    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('photo', photo);

    try {
      await axios.post(`${API}/api/requests`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Request submitted');
      setShowForm(false);
      setForm({ item_name: '', category: 'Tool', product_url: '', justification: '', l1_price: '', negotiation_notes: '', needed_by_date: getMinDate() });
      setPhoto(null);
      fetchRequests();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to submit'); }
    setSubmitting(false);
  };

  const handleApproval = async () => {
    if (!showApproval) return;
    if (approval.status === 'Approved' && (!approval.vendor_name || !approval.vendor_contact || !approval.best_price)) {
      toast.error('Vendor details required for approval'); return;
    }
    if (approval.status === 'Approved' && !approval.registered_company_confirmed) {
      toast.error('Must confirm vendor is registered company'); return;
    }
    try {
      await axios.patch(`${API}/api/requests/${showApproval}`, { ...approval, best_price: Number(approval.best_price) || 0 });
      toast.success(`Request ${approval.status.toLowerCase()}`);
      setShowApproval(null);
      setApproval({ status: '', rejection_reason: '', vendor_name: '', vendor_contact: '', best_price: '', registered_company_confirmed: false });
      fetchRequests();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    try { await axios.delete(`${API}/api/requests/${id}`); toast.success('Deleted'); fetchRequests(); }
    catch (e) { toast.error('Failed to delete'); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div data-testid="requests-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F9982E]/10 rounded-lg"><ClipboardList size={22} className="text-[#F9982E]" /></div>
          <div>
            <h1 className="font-heading text-2xl font-black text-white tracking-tight" data-testid="requests-title">REQUESTS</h1>
            <p className="text-xs text-[#52525B] font-data mt-0.5">Submit & track asset/tool/licence requests</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="new-request-btn" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg text-xs">
          <Plus size={16} className="mr-1.5" />New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {['Pending', 'Approved', 'Rejected', 'On Hold'].map(s => {
          const count = requests.filter(r => r.status === s).length;
          const style = STATUS_STYLES[s];
          return (
            <div key={s} className={`p-3 rounded-lg border ${style.border} ${style.bg}`} data-testid={`stat-${s.toLowerCase().replace(' ', '-')}`}>
              <span className={`text-lg font-bold font-data ${style.text}`}>{count}</span>
              <span className="text-[10px] text-[#71717A] font-data uppercase block">{s}</span>
            </div>
          );
        })}
      </div>

      {/* Request List */}
      {loading ? <p className="text-[#52525B] text-sm">Loading...</p> : requests.length === 0 ? (
        <div className="text-center py-16 text-[#52525B]"><ClipboardList size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No requests yet</p></div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => {
            const style = STATUS_STYLES[req.status] || STATUS_STYLES.Pending;
            const StatusIcon = style.icon;
            const isExpanded = expanded === req.id;
            return (
              <div key={req.id} className="bg-[#18181B] border border-[#232328] rounded-xl overflow-hidden" data-testid={`request-${req.id}`}>
                <button onClick={() => setExpanded(isExpanded ? null : req.id)} className="w-full flex items-center justify-between p-4 hover:bg-[#1C1C1F] transition-colors text-left">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-md ${style.bg}`}><StatusIcon size={14} className={style.text} /></div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-white block truncate">{req.item_name}</span>
                      <span className="text-[10px] text-[#52525B] font-data">{req.category} &middot; {req.submitted_by} &middot; {new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-data text-sm text-[#F9982E] font-bold">{fmt(req.l1_price)}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${style.bg} ${style.text}`}>{req.status}</span>
                    {isExpanded ? <ChevronUp size={14} className="text-[#52525B]" /> : <ChevronDown size={14} className="text-[#52525B]" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#232328] space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                      <div><span className="text-[9px] text-[#52525B] font-data block">NEEDED BY</span><span className="text-xs text-white font-data">{req.needed_by_date}</span></div>
                      <div><span className="text-[9px] text-[#52525B] font-data block">L1 PRICE</span><span className="text-xs text-[#F9982E] font-data font-bold">{fmt(req.l1_price)}</span></div>
                      <div><span className="text-[9px] text-[#52525B] font-data block">PRODUCT URL</span><a href={req.product_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1" data-testid={`request-url-${req.id}`}><ExternalLink size={10} />View</a></div>
                      <div><span className="text-[9px] text-[#52525B] font-data block">PHOTO</span><a href={`${API}/api/requests/${req.id}/photo`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1"><Image size={10} />View</a></div>
                    </div>
                    <div><span className="text-[9px] text-[#52525B] font-data block mb-1">JUSTIFICATION</span><p className="text-xs text-[#A1A1AA] whitespace-pre-line">{req.justification}</p></div>
                    {req.negotiation_notes && <div><span className="text-[9px] text-[#52525B] font-data block mb-1">NEGOTIATION NOTES</span><p className="text-xs text-[#A1A1AA]">{req.negotiation_notes}</p></div>}
                    {req.approval_details && (
                      <div className={`p-3 rounded-lg border ${style.border} ${style.bg}`}>
                        <span className="text-[9px] text-[#52525B] font-data block mb-2">{req.status.toUpperCase()} DETAILS</span>
                        {req.status === 'Approved' && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-[#52525B]">Vendor:</span> <span className="text-white">{req.approval_details.vendor_name}</span></div>
                            <div><span className="text-[#52525B]">Contact:</span> <span className="text-white">{req.approval_details.vendor_contact}</span></div>
                            <div><span className="text-[#52525B]">Best Price:</span> <span className="text-[#F9982E] font-bold">{fmt(req.approval_details.best_price)}</span></div>
                            <div><span className="text-[#52525B]">Registered Co.:</span> <span className="text-emerald-400">{req.approval_details.registered_company_confirmed ? 'Yes' : 'No'}</span></div>
                          </div>
                        )}
                        {req.status === 'Rejected' && <p className="text-xs text-red-300">{req.approval_details.rejection_reason}</p>}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      {isAdmin && req.status === 'Pending' && (
                        <>
                          <Button size="sm" onClick={() => { setShowApproval(req.id); setApproval({ ...approval, status: 'Approved' }); }} data-testid={`approve-btn-${req.id}`} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 rounded-md font-bold">Approve</Button>
                          <Button size="sm" onClick={() => { setShowApproval(req.id); setApproval({ ...approval, status: 'Rejected' }); }} data-testid={`reject-btn-${req.id}`} className="bg-red-600 hover:bg-red-700 text-white text-[10px] h-7 rounded-md font-bold">Reject</Button>
                          <Button size="sm" onClick={() => { setShowApproval(req.id); setApproval({ ...approval, status: 'On Hold' }); }} data-testid={`hold-btn-${req.id}`} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7 rounded-md font-bold">Hold</Button>
                        </>
                      )}
                      {isAdmin && <Button size="sm" variant="ghost" onClick={() => handleDelete(req.id)} data-testid={`delete-request-${req.id}`} className="text-red-400 hover:bg-red-500/10 text-[10px] h-7"><Trash2 size={12} /></Button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white font-heading">New Request</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Item Name *</label>
              <input value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} required data-testid="req-item-name" placeholder="e.g. DaVinci Resolve Studio" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Category *</label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9" data-testid="req-category"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">L1 Price (&#8377;) *</label>
                <input type="number" value={form.l1_price} onChange={e => setForm({ ...form, l1_price: e.target.value })} required min="1" data-testid="req-l1-price" placeholder="Best negotiated price" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Product / Service URL *</label>
              <input type="url" value={form.product_url} onChange={e => setForm({ ...form, product_url: e.target.value })} required data-testid="req-url" placeholder="https://..." className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Photo Attachment *</label>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} required data-testid="req-photo" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-[#71717A] text-sm px-3 pt-1.5 file:bg-[#232328] file:border-0 file:text-white file:text-xs file:rounded file:mr-2 file:px-2 file:py-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Justification (min 3 lines, multi-project benefit) *</label>
              <textarea value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })} required rows={4} data-testid="req-justification" placeholder={"Line 1: How this benefits Project A\nLine 2: How this benefits Project B\nLine 3: Long-term value for the company"} className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-[#F9982E] outline-none resize-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Negotiation Notes</label>
              <input value={form.negotiation_notes} onChange={e => setForm({ ...form, negotiation_notes: e.target.value })} data-testid="req-notes" placeholder="Who you spoke to, quotes received" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Needed By (min 1 week notice) *</label>
              <input type="date" value={form.needed_by_date} onChange={e => setForm({ ...form, needed_by_date: e.target.value })} min={getMinDate()} required data-testid="req-date" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} data-testid="submit-request-btn" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase text-xs w-full">{submitting ? 'Submitting...' : 'Submit Request'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={!!showApproval} onOpenChange={() => setShowApproval(null)}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading">{approval.status === 'Approved' ? 'Approve Request' : approval.status === 'Rejected' ? 'Reject Request' : 'Put On Hold'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {approval.status === 'Approved' && (
              <>
                <div>
                  <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Vendor Name *</label>
                  <input value={approval.vendor_name} onChange={e => setApproval({ ...approval, vendor_name: e.target.value })} data-testid="approval-vendor-name" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Vendor Contact *</label>
                  <input value={approval.vendor_contact} onChange={e => setApproval({ ...approval, vendor_contact: e.target.value })} data-testid="approval-vendor-contact" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Best Price (&#8377;) *</label>
                  <input type="number" value={approval.best_price} onChange={e => setApproval({ ...approval, best_price: e.target.value })} data-testid="approval-best-price" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={approval.registered_company_confirmed} onChange={e => setApproval({ ...approval, registered_company_confirmed: e.target.checked })} data-testid="approval-registered" className="rounded border-[#232328]" />
                  <span className="text-xs text-[#A1A1AA]">Vendor is a registered company with physical office</span>
                </label>
              </>
            )}
            {approval.status === 'Rejected' && (
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Reason for Rejection</label>
                <textarea value={approval.rejection_reason} onChange={e => setApproval({ ...approval, rejection_reason: e.target.value })} data-testid="approval-reason" rows={3} className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-red-500 outline-none resize-none" />
              </div>
            )}
            {approval.status === 'On Hold' && <p className="text-sm text-[#A1A1AA]">This request will be put on hold for further review.</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleApproval} data-testid="confirm-approval-btn" className={`font-bold uppercase text-xs w-full ${approval.status === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : approval.status === 'Rejected' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>Confirm {approval.status}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
