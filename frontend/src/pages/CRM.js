import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Target, Plus, Pencil, ChevronDown, ChevronUp, BarChart3, AlertTriangle, Clock, Phone, Mail, Building2, ArrowRight, Upload, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;
const SOURCES = ['Website', 'LinkedIn', 'Referral', 'Event', 'Cold Outreach', 'Other'];
const STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
const URGENCIES = ['Low', 'Medium', 'High'];
const SERVICES = ['Virtual Production', 'AI Content Creation', 'Brand Films', 'Architectural Visualization', 'Motion Capture', 'VFX', 'Other'];
const CLIENT_TYPES = ['Brand', 'Production House', 'Agency', 'Education Institute', 'Architecture Firm', 'Other'];
const STATUS_COLORS = { New: 'bg-blue-500/10 text-blue-400 border-blue-500/30', Contacted: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', Qualified: 'bg-violet-500/10 text-violet-400 border-violet-500/30', 'Proposal Sent': 'bg-amber-500/10 text-amber-400 border-amber-500/30', Negotiation: 'bg-orange-500/10 text-orange-400 border-orange-500/30', Won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', Lost: 'bg-red-500/10 text-red-400 border-red-500/30' };
const fmt = (n) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '-';
const INIT_LEAD = { name: '', company: '', email: '', phone: '', source: 'Website', service_interested: '', budget: '', urgency: 'Medium', assigned_to: '', notes: '', follow_up_date: '' };
const INIT_CLIENT = { company_name: '', industry: '', contact_person: '', designation: '', email: '', phone: '', address: '', gst_number: '', client_type: 'Brand', lead_id: null, notes: '' };
const ONBOARD_STEPS = [{ key: 'welcome_email', label: 'Welcome email sent' }, { key: 'contract_signed', label: 'Contract signed' }, { key: 'advance_received', label: 'Advance received' }, { key: 'brief_received', label: 'Brief document received' }, { key: 'kickoff_scheduled', label: 'Kick-off call scheduled' }];

export default function CRM() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(null);
  const [showImportResult, setShowImportResult] = useState(null);
  const [leadForm, setLeadForm] = useState({ ...INIT_LEAD });
  const [clientForm, setClientForm] = useState({ ...INIT_CLIENT });
  const [updateForm, setUpdateForm] = useState({ status: '', follow_up_date: '', notes: '', lost_reason: '' });
  const [expanded, setExpanded] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [clientSearch, setClientSearch] = useState('');
  const [clientFilterType, setClientFilterType] = useState('all');

  const fetchAll = async () => {
    try {
      const [lRes, cRes, dRes] = await Promise.all([
        axios.get(`${API}/api/crm/leads`), axios.get(`${API}/api/crm/clients`), axios.get(`${API}/api/crm/dashboard`)
      ]);
      setLeads(lRes.data); setClients(cRes.data); setDashboard(dRes.data);
    } catch (e) { toast.error('Failed to load CRM data'); }
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/crm/leads`, { ...leadForm, budget: Number(leadForm.budget) || 0 });
      toast.success('Lead created'); setShowLeadForm(false); setLeadForm({ ...INIT_LEAD }); fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleLeadUpdate = async () => {
    if (!showUpdateForm) return;
    try {
      const payload = {};
      if (updateForm.status) payload.status = updateForm.status;
      if (updateForm.follow_up_date) payload.follow_up_date = updateForm.follow_up_date;
      if (updateForm.notes) payload.notes = updateForm.notes;
      if (updateForm.lost_reason) payload.lost_reason = updateForm.lost_reason;
      await axios.patch(`${API}/api/crm/leads/${showUpdateForm}`, payload);
      toast.success('Lead updated'); setShowUpdateForm(null); fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await axios.post(`${API}/api/crm/leads/import-csv`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowImportResult(data);
      toast.success(`Imported ${data.created} leads`);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Import failed'); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const convertToClient = (lead) => {
    setClientForm({ ...INIT_CLIENT, company_name: lead.company || lead.name, contact_person: lead.name, email: lead.email, phone: lead.phone, lead_id: lead.id });
    setShowClientForm(true);
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/crm/clients`, clientForm);
      toast.success('Client created'); setShowClientForm(false); setClientForm({ ...INIT_CLIENT }); fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const toggleOnboarding = async (clientId, step, value) => {
    try {
      await axios.patch(`${API}/api/crm/clients/${clientId}/onboarding?step=${step}&value=${value}`);
      fetchAll();
    } catch (e) { toast.error('Failed'); }
  };

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (filterSource !== 'all' && l.source !== filterSource) return false;
    return true;
  });

  const filteredClients = clients.filter(c => {
    if (clientSearch) {
      const q = clientSearch.toLowerCase();
      const match = c.company_name?.toLowerCase().includes(q) || c.contact_person?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.address?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (clientFilterType !== 'all' && c.client_type !== clientFilterType) return false;
    return true;
  });

  const atRiskLeads = leads.filter(l => l.at_risk && l.status !== 'Won' && l.status !== 'Lost');

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'leads', label: 'Leads', icon: Target, count: leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length },
    { id: 'clients', label: 'Clients', icon: Building2, count: clients.length },
  ];

  return (
    <div data-testid="crm-page">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#F9982E]/10 rounded-lg"><Target size={24} className="text-[#F9982E]" /></div>
          <div>
            <h1 className="font-heading text-3xl font-black text-white tracking-tight" data-testid="crm-title">CRM</h1>
            <p className="text-sm text-[#52525B] font-data mt-0.5">Lead management &amp; client tracking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" data-testid="csv-import-input" />
          <Button onClick={() => fileRef.current?.click()} data-testid="import-csv-btn" className="bg-[#232328] hover:bg-[#2A2A30] text-[#A1A1AA] font-bold uppercase tracking-wider rounded-lg text-xs border border-[#232328]"><Upload size={14} className="mr-1.5" />Import CSV</Button>
          <Button onClick={() => { setClientForm({ ...INIT_CLIENT }); setShowClientForm(true); }} data-testid="add-client-btn" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider rounded-lg text-xs"><Building2 size={14} className="mr-1.5" />Add Client</Button>
          <Button onClick={() => { setLeadForm({ ...INIT_LEAD }); setShowLeadForm(true); }} data-testid="add-lead-btn" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg text-xs"><Plus size={16} className="mr-1.5" />New Lead</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0F0F0F] rounded-lg p-1 border border-[#232328] w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`crm-tab-${t.id}`}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-all ${tab === t.id ? 'bg-[#F9982E]/20 text-[#F9982E] border border-[#F9982E]/40' : 'text-[#52525B] hover:text-white border border-transparent'}`}>
            <t.icon size={16} />{t.label}{t.count !== undefined && <span className="bg-[#232328] text-[#71717A] text-xs px-2 rounded-full ml-1">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-5"><span className="text-xs text-[#52525B] font-data uppercase block mb-1">Leads This Month</span><span className="text-3xl font-bold text-white font-data">{dashboard.leads_this_month}</span></div>
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-5"><span className="text-xs text-[#52525B] font-data uppercase block mb-1">Conversion Rate</span><span className="text-3xl font-bold text-emerald-400 font-data">{dashboard.conversion_rate}%</span></div>
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-5"><span className="text-xs text-[#52525B] font-data uppercase block mb-1">Pipeline Value</span><span className="text-3xl font-bold text-[#F9982E] font-data">{fmt(dashboard.pipeline_value)}</span></div>
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-5"><span className="text-xs text-[#52525B] font-data uppercase block mb-1">Total Clients</span><span className="text-3xl font-bold text-white font-data">{dashboard.total_clients}</span></div>
          </div>
          {(dashboard.at_risk > 0 || dashboard.needs_attention > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {dashboard.at_risk > 0 && <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 flex items-center gap-3"><AlertTriangle size={22} className="text-red-400" /><div><span className="text-base font-bold text-red-400">{dashboard.at_risk} At Risk</span><span className="text-xs text-red-300/60 block">No contact in 5+ days</span></div></div>}
              {dashboard.needs_attention > 0 && <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex items-center gap-3"><Clock size={22} className="text-amber-400" /><div><span className="text-base font-bold text-amber-400">{dashboard.needs_attention} Need Attention</span><span className="text-xs text-amber-300/60 block">No activity for 48+ hours</span></div></div>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-5">
              <span className="text-sm font-bold text-white uppercase tracking-wider block mb-3">By Status</span>
              <div className="space-y-2">{STATUSES.map(s => { const c = dashboard.by_status?.[s] || 0; const style = STATUS_COLORS[s]; return (<div key={s} className="flex items-center justify-between"><span className={`text-xs px-2.5 py-1 rounded border ${style}`}>{s}</span><span className="text-sm text-white font-data font-bold">{c}</span></div>); })}</div>
            </div>
            <div className="bg-[#18181B] border border-[#232328] rounded-xl p-5">
              <span className="text-sm font-bold text-white uppercase tracking-wider block mb-3">By Source</span>
              <div className="space-y-2">{SOURCES.map(s => { const c = dashboard.by_source?.[s] || 0; return (<div key={s} className="flex items-center justify-between"><span className="text-xs text-[#A1A1AA]">{s}</span><span className="text-sm text-white font-data font-bold">{c}</span></div>); })}</div>
            </div>
          </div>
          {atRiskLeads.length > 0 && (
            <div className="bg-[#18181B] border border-red-500/20 rounded-xl p-5">
              <span className="text-sm font-bold text-red-400 uppercase tracking-wider block mb-3">At Risk Leads (5+ days inactive)</span>
              <div className="space-y-1">{atRiskLeads.map(l => (<div key={l.id} className="flex items-center justify-between bg-[#0F0F0F] rounded-lg px-4 py-2.5 border border-red-500/10"><div><span className="text-sm text-white font-bold">{l.name}</span><span className="text-xs text-[#52525B] ml-2">{l.company}</span></div><span className="text-xs text-red-400 font-data">{Math.round(l.hours_inactive / 24)}d ago</span></div>))}</div>
            </div>
          )}
        </div>
      )}

      {/* LEADS TAB */}
      {tab === 'leads' && (
        <>
          <div className="flex gap-2 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10 w-44 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="all">All Status</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={filterSource} onValueChange={setFilterSource}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10 w-44 text-sm"><SelectValue placeholder="All Sources" /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="all">All Sources</SelectItem>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <span className="text-sm text-[#52525B] font-data self-center ml-2">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredLeads.length === 0 ? <div className="text-center py-16 text-[#52525B]"><Target size={40} className="mx-auto mb-3 opacity-30" /><p className="text-base">No leads found</p></div> : (
            <div className="space-y-2">
              {filteredLeads.map(lead => {
                const style = STATUS_COLORS[lead.status] || STATUS_COLORS.New;
                const isExp = expanded === lead.id;
                return (
                  <div key={lead.id} className={`bg-[#18181B] border rounded-xl overflow-hidden ${lead.at_risk ? 'border-red-500/30' : lead.needs_attention ? 'border-amber-500/20' : 'border-[#232328]'}`} data-testid={`lead-${lead.id}`}>
                    <button onClick={() => setExpanded(isExp ? null : lead.id)} className="w-full flex items-center justify-between p-4 hover:bg-[#1C1C1F] transition-colors text-left">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {lead.at_risk && <AlertTriangle size={16} className="text-red-400 shrink-0" />}
                        {lead.needs_attention && !lead.at_risk && <Clock size={16} className="text-amber-400 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className="text-base font-bold text-white truncate">{lead.name}</span><span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${style}`}>{lead.status}</span></div>
                          <span className="text-xs text-[#52525B] font-data">{lead.company && `${lead.company} · `}{lead.source} · Score: {lead.score}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lead.budget > 0 && <span className="font-data text-base text-[#F9982E] font-bold">{fmt(lead.budget)}</span>}
                        {isExp ? <ChevronUp size={16} className="text-[#52525B]" /> : <ChevronDown size={16} className="text-[#52525B]" />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="px-4 pb-4 border-t border-[#232328] space-y-3 pt-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-data">
                          {lead.email && <div><span className="text-[#52525B] block mb-0.5">EMAIL</span><span className="text-white flex items-center gap-1"><Mail size={11} />{lead.email}</span></div>}
                          {lead.phone && <div><span className="text-[#52525B] block mb-0.5">PHONE</span><span className="text-white flex items-center gap-1"><Phone size={11} />{lead.phone}</span></div>}
                          <div><span className="text-[#52525B] block mb-0.5">URGENCY</span><span className={`font-bold ${lead.urgency === 'High' ? 'text-red-400' : lead.urgency === 'Medium' ? 'text-amber-400' : 'text-[#52525B]'}`}>{lead.urgency}</span></div>
                          <div><span className="text-[#52525B] block mb-0.5">SERVICE</span><span className="text-white">{lead.service_interested || '-'}</span></div>
                          {lead.follow_up_date && <div><span className="text-[#52525B] block mb-0.5">FOLLOW UP</span><span className="text-[#F9982E]">{lead.follow_up_date}</span></div>}
                          {lead.assigned_to && <div><span className="text-[#52525B] block mb-0.5">ASSIGNED TO</span><span className="text-white">{lead.assigned_to}</span></div>}
                        </div>
                        {lead.notes && <div><span className="text-xs text-[#52525B] font-data block mb-1">NOTES</span><p className="text-sm text-[#A1A1AA]">{lead.notes}</p></div>}
                        {lead.activity_log?.length > 0 && (
                          <div><span className="text-xs text-[#52525B] font-data block mb-1">ACTIVITY LOG</span>
                            <div className="space-y-1 max-h-32 overflow-y-auto">{lead.activity_log.slice().reverse().map((a, i) => (<div key={i} className="flex items-center gap-2 text-xs"><span className="text-[#3F3F46] font-data w-36 shrink-0">{new Date(a.at).toLocaleString()}</span><span className="text-[#A1A1AA]">{a.action}</span><span className="text-[#52525B]">by {a.by}</span></div>))}</div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={() => { setShowUpdateForm(lead.id); setUpdateForm({ status: lead.status, follow_up_date: lead.follow_up_date || '', notes: '', lost_reason: '' }); }} className="bg-transparent border border-[#232328] text-[#A1A1AA] hover:text-white text-xs h-8 font-bold"><Pencil size={12} className="mr-1" />Update</Button>
                          {lead.status !== 'Won' && lead.status !== 'Lost' && <Button size="sm" onClick={() => convertToClient(lead)} className="bg-emerald-600/20 text-emerald-400 text-xs h-8 font-bold hover:bg-emerald-600/30"><ArrowRight size={12} className="mr-1" />Convert to Client</Button>}
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

      {/* CLIENTS TAB */}
      {tab === 'clients' && (
        <>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search company, contact, city, email..." data-testid="client-search" className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm pl-9 pr-3 focus:border-emerald-500 outline-none" />
            </div>
            <Select value={clientFilterType} onValueChange={setClientFilterType}>
              <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10 w-48 text-sm" data-testid="client-filter-type"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#232328]"><SelectItem value="all">All Types</SelectItem>{CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-sm text-[#52525B] font-data self-center ml-2">{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredClients.length === 0 ? <div className="text-center py-16 text-[#52525B]"><Building2 size={40} className="mx-auto mb-3 opacity-30" /><p className="text-base">No clients found</p></div> : (
            <div className="space-y-2">
              {filteredClients.map(c => {
                const isExp = expanded === c.id;
                const ob = c.onboarding || {};
                const obDone = ONBOARD_STEPS.filter(s => ob[s.key]).length;
                const obPct = Math.round((obDone / ONBOARD_STEPS.length) * 100);
                return (
                  <div key={c.id} className="bg-[#18181B] border border-[#232328] rounded-xl overflow-hidden" data-testid={`client-${c.id}`}>
                    <button onClick={() => setExpanded(isExp ? null : c.id)} className="w-full flex items-center justify-between p-4 hover:bg-[#1C1C1F] transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="text-base font-bold text-white">{c.company_name}</span><span className="text-xs bg-[#232328] text-[#A1A1AA] px-2 py-0.5 rounded">{c.client_type}</span></div>
                        <span className="text-xs text-[#52525B] font-data">{c.contact_person}{c.designation && ` · ${c.designation}`}{c.industry && ` · ${c.industry}`}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24"><div className="flex justify-between text-xs font-data mb-0.5"><span className="text-[#52525B]">Onboard</span><span className={obPct === 100 ? 'text-emerald-400' : 'text-[#F9982E]'}>{obPct}%</span></div><div className="h-1.5 bg-[#232328] rounded-full"><div className={`h-1.5 rounded-full ${obPct === 100 ? 'bg-emerald-400' : 'bg-[#F9982E]'}`} style={{ width: `${obPct}%` }} /></div></div>
                        {isExp ? <ChevronUp size={16} className="text-[#52525B]" /> : <ChevronDown size={16} className="text-[#52525B]" />}
                      </div>
                    </button>
                    {isExp && (
                      <div className="px-4 pb-4 border-t border-[#232328] space-y-3 pt-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-data">
                          {c.email && <div><span className="text-[#52525B] block mb-0.5">EMAIL</span><span className="text-white">{c.email}</span></div>}
                          {c.phone && <div><span className="text-[#52525B] block mb-0.5">PHONE</span><span className="text-white">{c.phone}</span></div>}
                          {c.address && <div><span className="text-[#52525B] block mb-0.5">ADDRESS</span><span className="text-white">{c.address}</span></div>}
                          {c.gst_number && <div><span className="text-[#52525B] block mb-0.5">GST</span><span className="text-white">{c.gst_number}</span></div>}
                        </div>
                        <div><span className="text-xs text-[#52525B] font-data block mb-2">ONBOARDING CHECKLIST</span>
                          <div className="space-y-1.5">{ONBOARD_STEPS.map(s => (<label key={s.key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!ob[s.key]} onChange={(e) => toggleOnboarding(c.id, s.key, e.target.checked)} className="rounded border-[#232328]" /><span className={`text-sm ${ob[s.key] ? 'text-emerald-400 line-through' : 'text-[#A1A1AA]'}`}>{s.label}</span></label>))}</div>
                        </div>
                        {c.notes && <div><span className="text-xs text-[#52525B] font-data block mb-1">NOTES</span><p className="text-sm text-[#A1A1AA]">{c.notes}</p></div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* New Lead Dialog */}
      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white font-heading text-lg">New Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleLeadSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Name *</label><input value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} required data-testid="lead-name" className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Company</label><input value={leadForm.company} onChange={e => setLeadForm({ ...leadForm, company: e.target.value })} data-testid="lead-company" className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Email</label><input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} data-testid="lead-email" className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Phone</label><input value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} data-testid="lead-phone" className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Source</label><Select value={leadForm.source} onValueChange={v => setLeadForm({ ...leadForm, source: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10"><SelectValue /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]">{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Service</label><Select value={leadForm.service_interested} onValueChange={v => setLeadForm({ ...leadForm, service_interested: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]">{SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Budget (&#8377;)</label><input type="number" value={leadForm.budget} onChange={e => setLeadForm({ ...leadForm, budget: e.target.value })} data-testid="lead-budget" className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Urgency</label><Select value={leadForm.urgency} onValueChange={v => setLeadForm({ ...leadForm, urgency: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10"><SelectValue /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]">{URGENCIES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Follow Up</label><input type="date" value={leadForm.follow_up_date} onChange={e => setLeadForm({ ...leadForm, follow_up_date: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
            </div>
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Assigned To</label><input value={leadForm.assigned_to} onChange={e => setLeadForm({ ...leadForm, assigned_to: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Notes</label><textarea value={leadForm.notes} onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })} rows={2} className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-[#F9982E] outline-none resize-none" /></div>
            <DialogFooter><Button type="submit" data-testid="save-lead-btn" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase text-sm w-full h-10">Create Lead</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Lead Dialog */}
      <Dialog open={!!showUpdateForm} onOpenChange={() => setShowUpdateForm(null)}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading text-lg">Update Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Status</label><Select value={updateForm.status} onValueChange={v => setUpdateForm({ ...updateForm, status: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10"><SelectValue /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]">{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Follow Up Date</label><input type="date" value={updateForm.follow_up_date} onChange={e => setUpdateForm({ ...updateForm, follow_up_date: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] outline-none" /></div>
            {updateForm.status === 'Lost' && <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Reason for Loss</label><textarea value={updateForm.lost_reason} onChange={e => setUpdateForm({ ...updateForm, lost_reason: e.target.value })} rows={2} className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-red-500 outline-none resize-none" /></div>}
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Add Note</label><textarea value={updateForm.notes} onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })} rows={2} className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-[#F9982E] outline-none resize-none" /></div>
          </div>
          <DialogFooter><Button onClick={handleLeadUpdate} data-testid="confirm-update-btn" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase text-sm w-full h-10">Update Lead</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Client Dialog */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white font-heading text-lg">New Client</DialogTitle></DialogHeader>
          <form onSubmit={handleClientSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Company Name *</label><input value={clientForm.company_name} onChange={e => setClientForm({ ...clientForm, company_name: e.target.value })} required data-testid="client-company" className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Client Type</label><Select value={clientForm.client_type} onValueChange={v => setClientForm({ ...clientForm, client_type: v })}><SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-10"><SelectValue /></SelectTrigger><SelectContent className="bg-[#18181B] border-[#232328]">{CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Contact Person</label><input value={clientForm.contact_person} onChange={e => setClientForm({ ...clientForm, contact_person: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Designation</label><input value={clientForm.designation} onChange={e => setClientForm({ ...clientForm, designation: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Email</label><input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
              <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Phone</label><input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
            </div>
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Industry</label><input value={clientForm.industry} onChange={e => setClientForm({ ...clientForm, industry: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Address</label><input value={clientForm.address} onChange={e => setClientForm({ ...clientForm, address: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">GST Number</label><input value={clientForm.gst_number} onChange={e => setClientForm({ ...clientForm, gst_number: e.target.value })} className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-emerald-500 outline-none" /></div>
            <div><label className="text-xs text-[#71717A] font-data uppercase block mb-1">Notes</label><textarea value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} rows={2} className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-emerald-500 outline-none resize-none" /></div>
            <DialogFooter><Button type="submit" data-testid="save-client-btn" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-sm w-full h-10">Create Client</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={!!showImportResult} onOpenChange={() => setShowImportResult(null)}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-md">
          <DialogHeader><DialogTitle className="text-white font-heading text-lg">Import Results</DialogTitle></DialogHeader>
          {showImportResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-500/10 rounded-lg p-3 text-center"><span className="text-2xl font-bold text-emerald-400 font-data">{showImportResult.created}</span><span className="text-xs text-[#52525B] block">Imported</span></div>
                <div className="bg-amber-500/10 rounded-lg p-3 text-center"><span className="text-2xl font-bold text-amber-400 font-data">{showImportResult.duplicates}</span><span className="text-xs text-[#52525B] block">Duplicates</span></div>
                <div className="bg-red-500/10 rounded-lg p-3 text-center"><span className="text-2xl font-bold text-red-400 font-data">{showImportResult.errors}</span><span className="text-xs text-[#52525B] block">Errors</span></div>
              </div>
              {showImportResult.duplicates_list?.length > 0 && (
                <div><span className="text-xs text-[#52525B] block mb-1">Duplicate entries (skipped):</span>
                  <div className="max-h-32 overflow-y-auto space-y-1">{showImportResult.duplicates_list.map((d, i) => (<div key={i} className="text-xs text-[#A1A1AA] bg-[#0F0F0F] p-2 rounded">{d.name} ({d.email}) — exists as "{d.existing_name}"</div>))}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => setShowImportResult(null)} className="bg-[#F9982E] text-black font-bold uppercase text-sm w-full h-10">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
