import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Pencil, Trash2, Star, ExternalLink, Search, X } from 'lucide-react';
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
  'Rotoscoping', 'Tracking & Matchmove', 'Rendering & Lookdev', 'Sound Design', 'Other',
];

const AVAILABILITY = ['Available', 'Busy', 'On Hold'];
const ENGAGEMENT = ['Freelance', 'Retainer', 'Project-based'];
const AVAIL_STYLES = { Available: 'bg-emerald-500/10 text-emerald-400', Busy: 'bg-red-500/10 text-red-400', 'On Hold': 'bg-amber-500/10 text-amber-400' };

const INIT_FORM = { full_name: '', phone: '', email: '', city: '', portfolio_url: '', service_types: [], day_rate: '', project_rate: '', availability: 'Available', engagement_type: 'Freelance', projects_worked: '', rating: 3, internal_notes: '', last_engaged_date: '' };

const fmt = (n) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '-';

export default function Freelancers() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...INIT_FORM });
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchFreelancers = async () => {
    try {
      const { data } = await axios.get(`${API}/api/freelancers`);
      setFreelancers(data);
      setAccessDenied(false);
    } catch (e) {
      if (e.response?.status === 403) setAccessDenied(true);
      else toast.error('Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { fetchFreelancers(); }, []);

  if (!isAdmin || accessDenied) {
    return (
      <div data-testid="freelancers-page" className="text-center py-20">
        <Users size={48} className="mx-auto mb-4 text-[#52525B] opacity-30" />
        <h2 className="text-lg font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-sm text-[#52525B]">Only the admin can access the Freelancer Database</p>
      </div>
    );
  }

  const toggleService = (svc) => {
    setForm(prev => ({
      ...prev,
      service_types: prev.service_types.includes(svc) ? prev.service_types.filter(s => s !== svc) : [...prev.service_types, svc]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    const payload = { ...form, day_rate: Number(form.day_rate) || 0, project_rate: Number(form.project_rate) || 0, rating: Number(form.rating) || 3 };
    try {
      if (editId) {
        await axios.put(`${API}/api/freelancers/${editId}`, payload);
        toast.success('Freelancer updated');
      } else {
        await axios.post(`${API}/api/freelancers`, payload);
        toast.success('Freelancer added');
      }
      setShowForm(false); setEditId(null); setForm({ ...INIT_FORM }); fetchFreelancers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const openEdit = (fl) => {
    setForm({ ...fl, day_rate: fl.day_rate || '', project_rate: fl.project_rate || '' });
    setEditId(fl.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this freelancer?')) return;
    try { await axios.delete(`${API}/api/freelancers/${id}`); toast.success('Deleted'); fetchFreelancers(); }
    catch (e) { toast.error('Failed to delete'); }
  };

  const filtered = freelancers.filter(fl => {
    if (search && !fl.full_name.toLowerCase().includes(search.toLowerCase()) && !fl.city?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterService !== 'all' && !fl.service_types?.includes(filterService)) return false;
    if (filterAvailability !== 'all' && fl.availability !== filterAvailability) return false;
    return true;
  });

  return (
    <div data-testid="freelancers-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#8B5CF6]/10 rounded-lg"><Users size={22} className="text-[#8B5CF6]" /></div>
          <div>
            <h1 className="font-heading text-2xl font-black text-white tracking-tight" data-testid="freelancers-title">FREELANCER DATABASE</h1>
            <p className="text-xs text-[#52525B] font-data mt-0.5">3D & Post-production freelancers</p>
          </div>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ ...INIT_FORM }); setShowForm(true); }} data-testid="add-freelancer-btn" className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase tracking-wider rounded-lg text-xs">
          <Plus size={16} className="mr-1.5" />Add Freelancer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or city..." data-testid="fl-search" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm pl-8 pr-3 focus:border-[#8B5CF6] outline-none" />
        </div>
        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9 w-48 text-xs" data-testid="fl-filter-service"><SelectValue placeholder="All Services" /></SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#232328] max-h-60">
            <SelectItem value="all">All Services</SelectItem>
            {SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAvailability} onValueChange={setFilterAvailability}>
          <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9 w-36 text-xs" data-testid="fl-filter-avail"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#232328]">
            <SelectItem value="all">All Status</SelectItem>
            {AVAILABILITY.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="text-xs text-[#52525B] font-data mb-3">{filtered.length} freelancer{filtered.length !== 1 ? 's' : ''}</div>

      {/* List */}
      {loading ? <p className="text-[#52525B] text-sm">Loading...</p> : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#52525B]"><Users size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No freelancers found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(fl => (
            <div key={fl.id} className="bg-[#18181B] border border-[#232328] rounded-xl p-4" data-testid={`freelancer-${fl.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{fl.full_name}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${AVAIL_STYLES[fl.availability] || 'bg-[#232328] text-[#52525B]'}`}>{fl.availability}</span>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={10} className={i <= (fl.rating || 0) ? 'text-[#F9982E] fill-[#F9982E]' : 'text-[#232328]'} />)}</div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#71717A] font-data mb-2">
                    {fl.city && <span>{fl.city}</span>}
                    {fl.phone && <span>{fl.phone}</span>}
                    {fl.email && <span>{fl.email}</span>}
                    {fl.portfolio_url && <a href={fl.portfolio_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-0.5"><ExternalLink size={8} />Portfolio</a>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {fl.service_types?.map(s => <span key={s} className="text-[9px] bg-[#232328] text-[#A1A1AA] px-1.5 py-0.5 rounded">{s}</span>)}
                  </div>
                  <div className="flex gap-4 text-[10px] font-data text-[#52525B]">
                    <span>Day: <span className="text-[#F9982E]">{fmt(fl.day_rate)}</span></span>
                    <span>Project: <span className="text-[#F9982E]">{fmt(fl.project_rate)}</span></span>
                    <span>{fl.engagement_type}</span>
                    {fl.last_engaged_date && <span>Last: {fl.last_engaged_date}</span>}
                  </div>
                  {fl.projects_worked && <div className="mt-1 text-[10px] text-[#52525B]"><span className="text-[#71717A]">Projects:</span> {fl.projects_worked}</div>}
                  {fl.internal_notes && <div className="mt-1 text-[10px] text-amber-400/60 italic">{fl.internal_notes}</div>}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <button onClick={() => openEdit(fl)} data-testid={`edit-fl-${fl.id}`} className="p-1.5 rounded hover:bg-[#232328] text-[#52525B] hover:text-white transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(fl.id)} data-testid={`delete-fl-${fl.id}`} className="p-1.5 rounded hover:bg-red-500/10 text-[#52525B] hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={() => { setShowForm(false); setEditId(null); }}>
        <DialogContent className="bg-[#18181B] border-[#232328] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white font-heading">{editId ? 'Edit' : 'Add'} Freelancer</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required data-testid="fl-name" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="fl-phone" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="fl-email" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">City / Location</label>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} data-testid="fl-city" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Portfolio / Showreel URL</label>
              <input type="url" value={form.portfolio_url} onChange={e => setForm({ ...form, portfolio_url: e.target.value })} data-testid="fl-portfolio" placeholder="https://..." className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
            </div>

            {/* Service Types */}
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Service Types</label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-[#0F0F0F] rounded-lg border border-[#232328]" data-testid="fl-services">
                {SERVICE_TYPES.map(s => (
                  <button key={s} type="button" onClick={() => toggleService(s)}
                    className={`text-[9px] px-2 py-1 rounded transition-all ${form.service_types.includes(s) ? 'bg-[#8B5CF6] text-white' : 'bg-[#232328] text-[#71717A] hover:text-white'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Day Rate (&#8377;)</label>
                <input type="number" value={form.day_rate} onChange={e => setForm({ ...form, day_rate: e.target.value })} data-testid="fl-day-rate" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Project Rate (&#8377;)</label>
                <input type="number" value={form.project_rate} onChange={e => setForm({ ...form, project_rate: e.target.value })} data-testid="fl-project-rate" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Availability</label>
                <Select value={form.availability} onValueChange={v => setForm({ ...form, availability: v })}>
                  <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9" data-testid="fl-availability"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">{AVAILABILITY.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Engagement</label>
                <Select value={form.engagement_type} onValueChange={v => setForm({ ...form, engagement_type: v })}>
                  <SelectTrigger className="bg-[#0F0F0F] border-[#232328] text-white h-9" data-testid="fl-engagement"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-[#232328]">{ENGAGEMENT.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Rating (1-5)</label>
              <div className="flex gap-1" data-testid="fl-rating">
                {[1,2,3,4,5].map(i => (
                  <button key={i} type="button" onClick={() => setForm({ ...form, rating: i })} className="p-1">
                    <Star size={20} className={i <= form.rating ? 'text-[#F9982E] fill-[#F9982E]' : 'text-[#232328]'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Projects Worked On</label>
              <input value={form.projects_worked} onChange={e => setForm({ ...form, projects_worked: e.target.value })} data-testid="fl-projects" placeholder="Project names..." className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Last Engaged Date</label>
              <input type="date" value={form.last_engaged_date} onChange={e => setForm({ ...form, last_engaged_date: e.target.value })} data-testid="fl-last-date" className="w-full h-9 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#8B5CF6] outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#71717A] font-data uppercase block mb-1">Internal Notes (admin only)</label>
              <textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} rows={2} data-testid="fl-notes" className="w-full bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 py-2 focus:border-[#8B5CF6] outline-none resize-none" />
            </div>

            <DialogFooter>
              <Button type="submit" data-testid="save-freelancer-btn" className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold uppercase text-xs w-full">{editId ? 'Update' : 'Add'} Freelancer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
