import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Pencil, Trash2, Star, ExternalLink, Search, DollarSign, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const SERVICE_TYPES = [
  'Video Editing', 'Colour Grading', 'Motion Graphics', 'Compositing (Nuke)', 'Compositing (After Effects)',
  'VFX Supervision', '3D Modelling', 'Texturing & Shading', 'Lighting Artist', 'Environment Artist',
  'Character Artist', 'Rigging', 'Animation (3D)', 'Animation (2D)', 'Matte Painting',
  'Rotoscoping', 'Tracking & Matchmove', 'Rendering & Lookdev', 'Sound Design',
  'Unreal Engine Artist', 'Houdini Artist', 'Motion Capture', 'Other',
];
const RATE_TYPES = [
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_shot', label: 'Per Shot' },
  { value: 'per_project', label: 'Per Project' },
];
const AVAIL = ['Available', 'Busy', 'On Hold'];
const AVAIL_STYLES = { Available: 'bg-emerald-500/10 text-emerald-400', Busy: 'bg-red-500/10 text-red-400', 'On Hold': 'bg-amber-500/10 text-amber-400' };
const INIT_FL = { full_name: '', phone: '', email: '', city: '', portfolio_url: '', service_types: [], rate_type: 'per_day', standard_rate: '', availability: 'Available', internal_notes: '' };
const INIT_PAY = { freelancer_id: '', project_name: '', description: '', amount_charged: '', amount_paid: '', payment_date: new Date().toISOString().split('T')[0], status: 'Pending' };
const fmt = (n) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '-';

export default function Freelancers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('profiles');
  const [freelancers, setFreelancers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFlForm, setShowFlForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [editFlId, setEditFlId] = useState(null);
  const [flForm, setFlForm] = useState({ ...INIT_FL });
  const [payForm, setPayForm] = useState({ ...INIT_PAY });
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const fetchAll = async () => {
    try {
      const [flRes, payRes, dashRes] = await Promise.all([
        axios.get(`${API}/api/freelancers`),
        axios.get(`${API}/api/freelancer-payments`),
        axios.get(`${API}/api/freelancer-dashboard`),
      ]);
      setFreelancers(flRes.data);
      setPayments(payRes.data);
      setDashboard(dashRes.data);
    } catch (e) {
      if (e.response?.status === 403) return;
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  if (!isAdmin) {
    return (<div data-testid="freelancers-page" className="text-center py-20"><Users size={48} className="mx-auto mb-4 text-[#52525B] opacity-30" /><h2 className="text-lg font-bold text-white mb-1">Access Restricted</h2><p className="text-sm text-[#52525B]">Only the admin can access the Freelancer Module</p></div>);
  }

  const toggleService = (svc) => setFlForm(prev => ({ ...prev, service_types: prev.service_types.includes(svc) ? prev.service_types.filter(s => s !== svc) : [...prev.service_types, svc] }));

  const handleFlSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...flForm, standard_rate: Number(flForm.standard_rate) || 0 };
    try {
      if (editFlId) { await axios.put(`${API}/api/freelancers/${editFlId}`, payload); toast.success('Updated'); }
      else { await axios.post(`${API}/api/freelancers`, payload); toast.success('Added'); }
      setShowFlForm(false); setEditFlId(null); setFlForm({ ...INIT_FL }); fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/freelancer-payments`, { ...payForm, amount_charged: Number(payForm.amount_charged) || 0, amount_paid: Number(payForm.amount_paid) || 0 });
      toast.success('Payment recorded'); setShowPayForm(false); setPayForm({ ...INIT_PAY }); fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const deleteFreelancer = async (id) => { if (!window.confirm('Delete freelancer and all payments?')) return; try { await axios.delete(`${API}/api/freelancers/${id}`); toast.success('Deleted'); fetchAll(); } catch (e) { toast.error('Failed'); } };
  const deletePayment = async (id) => { if (!window.confirm('Delete this payment?')) return; try { await axios.delete(`${API}/api/freelancer-payments/${id}`); toast.success('Deleted'); fetchAll(); } catch (e) { toast.error('Failed'); } };

  const filtered = freelancers.filter(fl => {
    if (search && !fl.full_name.toLowerCase().includes(search.toLowerCase()) && !fl.city?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterService !== 'all' && !fl.service_types?.includes(filterService)) return false;
    return true;
  });

  const TABS = [
    { id: 'profiles', label: 'Profiles', icon: Users },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <div data-testid="freelancers-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#8B5CF6]/10 rounded-lg"><Users size={22} className="text-[#8B5CF6]" /></div>
          <div>
            <h1 className="font-heading text-2xl font-black text-white tracking-tight" data-testid="freelancers-title">FREELANCER EXPENSES</h1>
            <p className="text-xs text-[#52525B] font-data mt-0.5">Track freelancer costs across projects</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setPayForm({ ...INIT_PAY }); setShowPayForm(true); }} data-testid="add-payment-btn" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider rounded-lg text-xs">
            <DollarSign size={14} className="mr-1" />Record Payment
          </Button>
          <Button onClick={() => { setEditFlId(null); setFlForm({ ...INIT_FL }); setShowFlForm(true); }} data-testid="add-freelancer-btn" className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase tracking-wider rounded-lg text-xs">
            <Plus size={16} className="mr-1" />Add Freelancer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0F0F0F] rounded-lg p-1 border border-[#232328] w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all ${tab === t.id ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40' : 'text-[#52525B] hover:text-white border border-transparent'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* PROFILES TAB */}
      {tab === 'profiles' && (
        <>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or city..." data-testid="fl-search" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm pl-8 pr-3 focus:border-[#8B5CF6] outline-none" />
            </div>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9 w-48 text-xs" data-testid="fl-filter-service"><SelectValue placeholder="All Services" /></SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#232328] max-h-60"><SelectItem value="all">All Services</SelectItem>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {filtered.length === 0 ? <div className="text-center py-16 text-[#52525B]"><Users size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No freelancers</p></div> : (
            <div className="space-y-2">
              {filtered.map(fl => {
                const flPayments = payments.filter(p => p.freelancer_id === fl.id);
                const isExp = expanded === fl.id;
                return (
                  <div key={fl.id} className="bg-[#18181B] border border-[#232328] rounded-xl overflow-hidden" data-testid={`freelancer-${fl.id}`}>
                    <button onClick={() => setExpanded(isExp ? null : fl.id)} className="w-full flex items-center justify-between p-4 hover:bg-[#1C1C1F] transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{fl.full_name}</span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${AVAIL_STYLES[fl.availability] || 'bg-[#232328] text-[#52525B]'}`}>{fl.availability}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">{fl.service_types?.slice(0, 3).map(s => <span key={s} className="text-[9px] bg-[#232328] text-[#A1A1AA] px-1.5 py-0.5 rounded">{s}</span>)}{fl.service_types?.length > 3 && <span className="text-[9px] text-[#52525B]">+{fl.service_types.length - 3}</span>}</div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div><span className="text-[9px] text-[#52525B] font-data block">RATE</span><span className="text-xs text-[#F9982E] font-data font-bold">{fmt(fl.standard_rate)}<span className="text-[8px] text-[#52525B]">/{fl.rate_type?.replace('per_','')}</span></span></div>
                        <div><span className="text-[9px] text-[#52525B] font-data block">TOTAL PAID</span><span className="text-xs text-emerald-400 font-data font-bold">{fmt(fl.total_paid || 0)}</span></div>
                        <div><span className="text-[9px] text-[#52525B] font-data block">PROJECTS</span><span className="text-xs text-white font-data font-bold">{fl.projects_count || 0}</span></div>
                        {isExp ? <ChevronUp size={14} className="text-[#52525B]" /> : <ChevronDown size={14} className="text-[#52525B]" />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="px-4 pb-4 border-t border-[#232328] space-y-3 pt-3">
                        <div className="grid grid-cols-4 gap-3 text-[10px] font-data">
                          {fl.phone && <div><span className="text-[#52525B] block">PHONE</span><span className="text-white">{fl.phone}</span></div>}
                          {fl.email && <div><span className="text-[#52525B] block">EMAIL</span><span className="text-white">{fl.email}</span></div>}
                          {fl.city && <div><span className="text-[#52525B] block">CITY</span><span className="text-white">{fl.city}</span></div>}
                          {fl.portfolio_url && <div><span className="text-[#52525B] block">PORTFOLIO</span><a href={fl.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-0.5"><ExternalLink size={8} />View</a></div>}
                        </div>
                        <div className="flex flex-wrap gap-1">{fl.service_types?.map(s => <span key={s} className="text-[9px] bg-[#8B5CF6]/10 text-[#8B5CF6] px-1.5 py-0.5 rounded">{s}</span>)}</div>
                        {fl.internal_notes && <p className="text-[10px] text-amber-400/60 italic">{fl.internal_notes}</p>}

                        {/* Payment History */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-[#71717A] font-data uppercase">Payment History</span>
                            <Button size="sm" onClick={() => { setPayForm({ ...INIT_PAY, freelancer_id: fl.id }); setShowPayForm(true); }} className="bg-emerald-600/20 text-emerald-400 text-[9px] h-6 font-bold hover:bg-emerald-600/30"><DollarSign size={10} className="mr-1" />Add Payment</Button>
                          </div>
                          {flPayments.length === 0 ? <p className="text-[10px] text-[#3F3F46]">No payments recorded</p> : (
                            <div className="space-y-1">
                              {flPayments.map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-[#0F0F0F] rounded-lg px-3 py-2 border border-[#232328]">
                                  <div>
                                    <span className="text-xs text-white font-bold">{p.project_name}</span>
                                    {p.description && <span className="text-[9px] text-[#52525B] ml-2">{p.description}</span>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right"><span className="text-[9px] text-[#52525B] block">CHARGED</span><span className="text-[10px] text-white font-data">{fmt(p.amount_charged)}</span></div>
                                    <div className="text-right"><span className="text-[9px] text-[#52525B] block">PAID</span><span className="text-[10px] text-emerald-400 font-data font-bold">{fmt(p.amount_paid)}</span></div>
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'Partial' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{p.status}</span>
                                    <button onClick={() => deletePayment(p.id)} className="p-1 text-[#52525B] hover:text-red-400"><Trash2 size={10} /></button>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-end gap-4 pt-1 text-[10px] font-data">
                                <span className="text-[#52525B]">Total Charged: <span className="text-white font-bold">{fmt(flPayments.reduce((s, p) => s + (p.amount_charged || 0), 0))}</span></span>
                                <span className="text-[#52525B]">Total Paid: <span className="text-emerald-400 font-bold">{fmt(flPayments.reduce((s, p) => s + (p.amount_paid || 0), 0))}</span></span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={() => { setFlForm({ ...fl, standard_rate: fl.standard_rate || '' }); setEditFlId(fl.id); setShowFlForm(true); }} data-testid={`edit-fl-${fl.id}`} className="bg-transparent border border-[#232328] text-[#A1A1AA] hover:text-white text-[10px] h-7 font-bold"><Pencil size={10} className="mr-1" />Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteFreelancer(fl.id)} data-testid={`delete-fl-${fl.id}`} className="text-red-400 hover:bg-red-500/10 text-[10px] h-7"><Trash2 size={10} className="mr-1" />Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* PAYMENTS TAB */}
      {tab === 'payments' && (
        <div className="space-y-2">
          {payments.length === 0 ? <div className="text-center py-16 text-[#52525B]"><DollarSign size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No payments recorded</p></div> :
            payments.map(p => {
              const fl = freelancers.find(f => f.id === p.freelancer_id);
              return (
                <div key={p.id} className="bg-[#18181B] border border-[#232328] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white">{fl?.full_name || 'Unknown'}</span>
                    <span className="text-[10px] text-[#52525B] font-data ml-2">{p.project_name}</span>
                    {p.description && <span className="text-[10px] text-[#3F3F46] ml-2">{p.description}</span>}
                    <div className="text-[9px] text-[#3F3F46] font-data mt-0.5">{p.payment_date}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><span className="text-[9px] text-[#52525B] block">CHARGED</span><span className="text-sm text-white font-data">{fmt(p.amount_charged)}</span></div>
                    <div className="text-right"><span className="text-[9px] text-[#52525B] block">PAID</span><span className="text-sm text-emerald-400 font-data font-bold">{fmt(p.amount_paid)}</span></div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'Partial' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{p.status}</span>
                    <button onClick={() => deletePayment(p.id)} className="p-1.5 text-[#52525B] hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-4"><span className="text-[10px] text-[#52525B] font-data uppercase block">Total Spent</span><span className="text-2xl font-bold text-emerald-400 font-data" data-testid="dash-total-spent">{fmt(dashboard.total_spent)}</span></div>
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-4"><span className="text-[10px] text-[#52525B] font-data uppercase block">Total Charged</span><span className="text-2xl font-bold text-[#F9982E] font-data">{fmt(dashboard.total_charged)}</span></div>
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-4"><span className="text-[10px] text-[#52525B] font-data uppercase block">Freelancers</span><span className="text-2xl font-bold text-white font-data">{dashboard.total_freelancers}</span></div>
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-4"><span className="text-[10px] text-[#52525B] font-data uppercase block">Payments</span><span className="text-2xl font-bold text-white font-data">{dashboard.total_payments}</span></div>
          </div>
          {dashboard.project_summary?.length > 0 && (
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Project-wise Spending</span>
              <div className="space-y-2">
                {dashboard.project_summary.map((ps, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0F0F0F] rounded-lg px-4 py-3 border border-[#232328]">
                    <div><span className="text-sm text-white font-bold">{ps.project}</span><span className="text-[10px] text-[#52525B] ml-2">{ps.freelancer_count} freelancer{ps.freelancer_count > 1 ? 's' : ''}</span></div>
                    <div className="flex gap-4"><div className="text-right"><span className="text-[9px] text-[#52525B] block">CHARGED</span><span className="text-sm text-[#F9982E] font-data font-bold">{fmt(ps.charged)}</span></div><div className="text-right"><span className="text-[9px] text-[#52525B] block">PAID</span><span className="text-sm text-emerald-400 font-data font-bold">{fmt(ps.paid)}</span></div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Freelancer Dialog */}
      <Dialog open={showFlForm} onOpenChange={() => { setShowFlForm(false); setEditFlId(null); }}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white font-heading">{editFlId ? 'Edit' : 'Add'} Freelancer</DialogTitle></DialogHeader>
          <form onSubmit={handleFlSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Full Name *</label><input value={flForm.full_name} onChange={e => setFlForm({ ...flForm, full_name: e.target.value })} required data-testid="fl-name" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" /></div>
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Phone</label><input value={flForm.phone} onChange={e => setFlForm({ ...flForm, phone: e.target.value })} data-testid="fl-phone" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" /></div>
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Email</label><input type="email" value={flForm.email} onChange={e => setFlForm({ ...flForm, email: e.target.value })} data-testid="fl-email" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" /></div>
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">City</label><input value={flForm.city} onChange={e => setFlForm({ ...flForm, city: e.target.value })} data-testid="fl-city" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" /></div>
            </div>
            <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Portfolio URL</label><input type="url" value={flForm.portfolio_url} onChange={e => setFlForm({ ...flForm, portfolio_url: e.target.value })} data-testid="fl-portfolio" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" /></div>
            <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Service Types</label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-[#0F0F0F] rounded-lg border border-[#232328]" data-testid="fl-services">
                {SERVICE_TYPES.map(s => (<button key={s} type="button" onClick={() => toggleService(s)} className={`text-[9px] px-2 py-1 rounded transition-all ${flForm.service_types.includes(s) ? 'bg-[#8B5CF6] text-white' : 'bg-[#232328] text-[#71717A] hover:text-white'}`}>{s}</button>))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Rate Type</label>
                <Select value={flForm.rate_type} onValueChange={v => setFlForm({ ...flForm, rate_type: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9" data-testid="fl-rate-type"><SelectValue /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]">{RATE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Standard Rate (&#8377;)</label><input type="number" value={flForm.standard_rate} onChange={e => setFlForm({ ...flForm, standard_rate: e.target.value })} data-testid="fl-rate" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" /></div>
            </div>
            <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Availability</label>
              <Select value={flForm.availability} onValueChange={v => setFlForm({ ...flForm, availability: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9" data-testid="fl-availability"><SelectValue /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]">{AVAIL.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Internal Notes</label><textarea value={flForm.internal_notes} onChange={e => setFlForm({ ...flForm, internal_notes: e.target.value })} rows={2} data-testid="fl-notes" className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-[#8B5CF6] outline-none resize-none" /></div>
            <DialogFooter><Button type="submit" data-testid="save-freelancer-btn" className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase text-xs w-full">{editFlId ? 'Update' : 'Add'} Freelancer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPayForm} onOpenChange={setShowPayForm}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading">Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handlePaySubmit} className="space-y-3">
            <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Freelancer *</label>
              <Select value={payForm.freelancer_id} onValueChange={v => setPayForm({ ...payForm, freelancer_id: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9" data-testid="pay-fl"><SelectValue placeholder="Select freelancer" /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328] max-h-60">{freelancers.map(fl => <SelectItem key={fl.id} value={fl.id}>{fl.full_name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Project Name *</label><input value={payForm.project_name} onChange={e => setPayForm({ ...payForm, project_name: e.target.value })} required data-testid="pay-project" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
            <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Description</label><input value={payForm.description} onChange={e => setPayForm({ ...payForm, description: e.target.value })} data-testid="pay-desc" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Amount Charged *</label><input type="number" value={payForm.amount_charged} onChange={e => setPayForm({ ...payForm, amount_charged: e.target.value })} required data-testid="pay-charged" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Amount Paid *</label><input type="number" value={payForm.amount_paid} onChange={e => setPayForm({ ...payForm, amount_paid: e.target.value })} required data-testid="pay-paid" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Payment Date</label><input type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} data-testid="pay-date" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Status</label>
                <Select value={payForm.status} onValueChange={v => setPayForm({ ...payForm, status: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9" data-testid="pay-status"><SelectValue /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Partial">Partial</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent></Select>
              </div>
            </div>
            <DialogFooter><Button type="submit" data-testid="save-payment-btn" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs w-full">Record Payment</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
