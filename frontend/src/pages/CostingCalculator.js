import { useState } from 'react';
import { Copy, Check, RotateCcw, ChevronDown, ChevronUp, IndianRupee, X, Download, Film, Clapperboard } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
const fmtShort = (amount) => {
  const n = Math.round(amount);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return fmt(n);
};

/* ─── Shared Inputs ─── */

function NumInput({ label, value, onChange, testId, placeholder = '0' }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B] text-sm">₹</span>
        <input type="number" data-testid={testId} value={value || ''} onChange={(e) => onChange(Number(e.target.value) || 0)} placeholder={placeholder}
          className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm pl-8 pr-3 focus:border-[#F9982E] focus:ring-1 focus:ring-[#F9982E]/20 outline-none transition-all placeholder:text-[#333] font-data" />
      </div>
    </div>
  );
}

function CountInput({ label, value, onChange, testId }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider mb-1.5 block">{label}</label>
      <input type="number" min="1" data-testid={testId} value={value} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 text-center focus:border-[#F9982E] focus:ring-1 focus:ring-[#F9982E]/20 outline-none transition-all font-data" />
    </div>
  );
}

function TextInput({ label, value, onChange, testId, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider mb-1.5 block">{label}</label>
      <input type={type} data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] focus:ring-1 focus:ring-[#F9982E]/20 outline-none transition-all placeholder:text-[#333]" />
    </div>
  );
}

function SubTotal({ label, amount }) {
  return (
    <div className="p-3 bg-[#0F0F0F] rounded-lg border border-[#232328] flex justify-between items-center">
      <span className="text-[11px] text-[#52525B] font-data uppercase">{label}</span>
      <span className="font-data text-sm text-[#F9982E] font-bold">{fmt(amount)}</span>
    </div>
  );
}

function VPSection({ title, total, children, testId, defaultOpen = true, hideTotal = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#18181B] border border-[#232328] rounded-xl overflow-hidden" data-testid={testId}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-[#1C1C1F] transition-colors" data-testid={`${testId}-toggle`}>
        <span className="text-sm font-bold text-white uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-3">
          {!hideTotal && <span className="font-data text-sm text-[#F9982E] font-bold">{fmtShort(total)}</span>}
          {open ? <ChevronUp size={16} className="text-[#52525B]" /> : <ChevronDown size={16} className="text-[#52525B]" />}
        </div>
      </button>
      {open && <div className="px-4 pb-4 border-t border-[#232328]">{children}</div>}
    </div>
  );
}

function CopyBtn({ text, testId }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <button onClick={handleCopy} data-testid={testId} className="p-2 rounded-lg text-[#52525B] hover:text-[#F9982E] hover:bg-[#F9982E]/10 transition-all" title="Copy">
      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
    </button>
  );
}

/* ─── Regular Production Data ─── */

const createId = () => Math.random().toString(36).substr(2, 9);
const defaultLineItem = (name, perDay = false, qty = 1, rate = 0) => ({ id: createId(), name, perDay, qty, rate, enabled: true });

const SECTION_COLORS = {
  preProduction: '#7F77DD', production: '#1D9E75', postProduction: '#378ADD',
  marketing: '#D85A30', legal: '#D4537E',
};

const buildPreProduction = () => [
  defaultLineItem('Story rights & script'), defaultLineItem('Producer fee'), defaultLineItem('Director fee'),
  defaultLineItem('Casting director'), defaultLineItem('Principal talent'), defaultLineItem('Storyboarding & shot lists'),
  defaultLineItem('Location scouting'), defaultLineItem('Permits (pre-production)'),
  defaultLineItem('Production design planning'), defaultLineItem('Travel (pre-production)'),
  defaultLineItem('Legal & E&O insurance'), defaultLineItem('Kit fees (prep)'), defaultLineItem('Contingency'),
];

const buildProduction = () => [
  defaultLineItem('Director of Photography', true), defaultLineItem('Camera operator(s)', true),
  defaultLineItem('1st AC / Focus puller', true), defaultLineItem('Gaffer', true),
  defaultLineItem('Key grip', true), defaultLineItem('Grips / electricians', true, 2),
  defaultLineItem('Sound recordist', true), defaultLineItem('Art director', true),
  defaultLineItem('Wardrobe stylist', true), defaultLineItem('Hair & make-up artist', true),
  defaultLineItem('Line producer', true), defaultLineItem('1st AD', true),
  defaultLineItem('Production assistants', true, 3),
  defaultLineItem('Camera package', true), defaultLineItem('Lens package', true),
  defaultLineItem('Lighting kit', true), defaultLineItem('Grip gear', true),
  defaultLineItem('Sound gear', true), defaultLineItem('DIT / data management', true),
  defaultLineItem('Location rental', true), defaultLineItem('Permits & municipal', true),
  defaultLineItem('Transportation', true), defaultLineItem('Accommodation', true),
  defaultLineItem('Catering', true), defaultLineItem('Safety & security', true),
  defaultLineItem('Insurance premiums'),
];

const buildPostProduction = () => [
  defaultLineItem('Editor salary'), defaultLineItem('Color correction & grading'),
  defaultLineItem('Visual effects'), defaultLineItem('Motion graphics & titles'),
  defaultLineItem('Sound design'), defaultLineItem('Sound mixing'),
  defaultLineItem('Music composition'), defaultLineItem('Music licensing'),
  defaultLineItem('Subtitles & captioning'), defaultLineItem('Mastering & deliverables'),
];

const buildMarketing = () => [
  defaultLineItem('Trailer / teaser edit'), defaultLineItem('Key art & graphic design'),
  defaultLineItem('Publicity & PR'), defaultLineItem('Festival submissions'),
  defaultLineItem('Digital marketing'), defaultLineItem('Distribution fees'),
];

const buildLegal = () => [
  defaultLineItem('Payroll administration'), defaultLineItem('Accounting & bookkeeping'),
  defaultLineItem('Legal fees'), defaultLineItem('Insurance deductibles'),
  defaultLineItem('Contingency reserve'), defaultLineItem('Taxes & incentives'),
];

const REG_SECTIONS = [
  { key: 'preProduction', label: 'Pre-production', build: buildPreProduction },
  { key: 'production', label: 'Production', build: buildProduction },
  { key: 'postProduction', label: 'Post-production', build: buildPostProduction },
  { key: 'marketing', label: 'Marketing & Distribution', build: buildMarketing },
  { key: 'legal', label: 'Legal & Misc', build: buildLegal },
];

const initRegSections = () => {
  const s = {};
  REG_SECTIONS.forEach(sec => { s[sec.key] = sec.build(); });
  return s;
};

/* ─── Regular Production Line Item Row ─── */

function RegLineItem({ item, shootDays, onChange, onRemove }) {
  const days = item.perDay ? shootDays : 1;
  const sub = item.enabled ? item.qty * item.rate * days : 0;
  return (
    <div className={`grid items-center py-2.5 border-b border-[#1A1A1E] hover:bg-[#0F0F0F]/50 transition-colors ${!item.enabled ? 'opacity-30' : ''}`}
      style={{ gridTemplateColumns: '2fr 80px 80px 140px 130px 36px' }} data-testid={`reg-line-${item.id}`}>
      {/* Item name */}
      <input value={item.name} onChange={e => onChange(item.id, 'name', e.target.value)}
        className="bg-transparent text-sm text-white outline-none px-2 h-9 rounded hover:bg-[#232328]/50 focus:bg-[#232328] transition-colors" />
      {/* Days indicator */}
      <div className="text-center">
        <span className={`text-xs font-data font-medium px-2 py-1 rounded ${item.perDay ? 'bg-emerald-500/10 text-emerald-400' : 'text-[#52525B]'}`}>
          {item.perDay ? `× ${shootDays} days` : 'Fixed'}
        </span>
      </div>
      {/* Qty */}
      <input type="number" min="0" value={item.qty} onChange={e => onChange(item.id, 'qty', Math.max(0, parseInt(e.target.value) || 0))}
        className="bg-[#0F0F0F] border border-[#232328] rounded-lg text-sm text-white text-center h-9 font-data w-full outline-none mx-auto focus:border-emerald-500 transition-colors" />
      {/* Rate */}
      <div className="relative px-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B] text-xs">₹</span>
        <input type="number" min="0" value={item.rate} onChange={e => onChange(item.id, 'rate', Math.max(0, parseFloat(e.target.value) || 0))}
          className="bg-[#0F0F0F] border border-[#232328] rounded-lg text-sm text-white text-right pr-3 pl-6 h-9 font-data w-full outline-none focus:border-emerald-500 transition-colors" />
      </div>
      {/* Subtotal */}
      <div className="text-right pr-2">
        <span className="font-data text-sm font-bold text-white">{fmt(sub)}</span>
      </div>
      {/* Remove */}
      <button onClick={() => onRemove(item.id)} data-testid={`remove-${item.id}`}
        className="p-1.5 rounded-md text-[#3F3F46] hover:text-red-400 hover:bg-red-400/10 transition-all mx-auto">
        <X size={14} />
      </button>
    </div>
  );
}

/* ─── Regular Production Section ─── */

function RegSection({ sectionKey, label, items, shootDays, onUpdate }) {
  const [open, setOpen] = useState(false);
  const color = SECTION_COLORS[sectionKey];
  const total = items.reduce((s, i) => {
    if (!i.enabled) return s;
    return s + i.qty * i.rate * (i.perDay ? shootDays : 1);
  }, 0);

  const handleChange = (id, field, value) => onUpdate(sectionKey, items.map(i => i.id === id ? { ...i, [field]: value } : i));
  const handleRemove = (id) => onUpdate(sectionKey, items.filter(i => i.id !== id));
  const handleAdd = () => onUpdate(sectionKey, [...items, defaultLineItem('New item', false, 1, 0)]);

  return (
    <div className="bg-[#18181B] border border-[#232328] rounded-xl overflow-hidden" data-testid={`reg-${sectionKey}`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1C1C1F] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded" style={{ background: color }} />
          <span className="text-sm font-bold text-white uppercase tracking-wider">{label}</span>
          <span className="text-xs text-[#52525B] font-data">{items.length} items</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-data text-base font-bold" style={{ color }}>{fmtShort(total)}</span>
          {open ? <ChevronUp size={16} className="text-[#52525B]" /> : <ChevronDown size={16} className="text-[#52525B]" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-[#232328]">
          {/* Column headers */}
          <div className="grid items-center py-3 text-[11px] text-[#52525B] uppercase tracking-wider font-medium border-b border-[#232328]"
            style={{ gridTemplateColumns: '2fr 80px 80px 140px 130px 36px' }}>
            <span className="px-2">Item</span>
            <span className="text-center">Days</span>
            <span className="text-center">Qty</span>
            <span className="text-center">Rate (₹)</span>
            <span className="text-right pr-2">Subtotal</span>
            <span />
          </div>
          {/* Line items */}
          {items.map(item => (
            <RegLineItem key={item.id} item={item} shootDays={shootDays} onChange={handleChange} onRemove={handleRemove} />
          ))}
          {/* Add button */}
          <button onClick={handleAdd} data-testid={`add-item-${sectionKey}`}
            className="mt-3 w-full border border-dashed border-[#2A2A30] rounded-lg py-2.5 text-sm text-[#52525B] hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all font-medium">
            + Add line item
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */

const INIT_CLIENT = { personName: '', companyName: '', revisionNumber: '1', email: '', quotationDate: new Date().toISOString().split('T')[0] };
const INIT_VP = { perDayRate: 0, numberOfDays: 1, environmentCost: 0, numberOfEnvironments: 1, travelCost: 0, misCost: 6000 };
const INIT_EXT = { compositionPerShot: 0, numberOfShots: 1, dop: 0, lightRental: 0, lensRental: 0, hairMakeup: 0, artDecor: 0, artTeam: 0, producer: 0, stylist: 0, creativeDirector: 0, director: 0, actor: 0, logistics: 0 };
const INIT_POST = { sound: 0, color: 0, editing: 0 };

export default function CostingCalculator() {
  const [client, setClient] = useState({ ...INIT_CLIENT });
  const [vp, setVp] = useState({ ...INIT_VP });
  const [ext, setExt] = useState({ ...INIT_EXT });
  const [post, setPost] = useState({ ...INIT_POST });
  const [regSections, setRegSections] = useState(initRegSections);
  const [regShootDays, setRegShootDays] = useState(5);
  const [activeTab, setActiveTab] = useState('vp'); // 'vp' | 'regular'

  // VP totals
  const vpTotal = (vp.perDayRate * vp.numberOfDays) + (vp.environmentCost * vp.numberOfEnvironments) + (vp.travelCost * 1.05) + vp.misCost;
  const extCompositionTotal = ext.compositionPerShot * ext.numberOfShots;
  const extOtherTotal = ext.dop + ext.lightRental + ext.lensRental + ext.hairMakeup + ext.artDecor + ext.artTeam + ext.producer + ext.stylist + ext.creativeDirector + ext.director + ext.actor + ext.logistics;
  const extTotal = extCompositionTotal + extOtherTotal;
  const postTotal = post.sound + post.color + post.editing;
  const vpGrandTotal = vpTotal + extTotal + postTotal;

  // Regular production total
  const regSectionTotals = REG_SECTIONS.map(sec => {
    const items = regSections[sec.key] || [];
    return { ...sec, total: items.reduce((s, i) => i.enabled ? s + i.qty * i.rate * (i.perDay ? regShootDays : 1) : s, 0) };
  });
  const regTotal = regSectionTotals.reduce((s, sec) => s + sec.total, 0);
  const combinedTotal = vpGrandTotal + regTotal;

  const updateRegSection = (key, items) => setRegSections(prev => ({ ...prev, [key]: items }));

  const reset = () => {
    setClient({ ...INIT_CLIENT }); setVp({ ...INIT_VP }); setExt({ ...INIT_EXT }); setPost({ ...INIT_POST });
    setRegSections(initRegSections()); setRegShootDays(5);
    toast.success('Calculator reset');
  };

  const exportCSV = () => {
    let csv = 'Category,Section,Item,Qty,Rate,Days,Subtotal\n';
    csv += `Virtual Production,VP Studio,Per Day Rate,${vp.numberOfDays},${vp.perDayRate},${vp.numberOfDays},${vp.perDayRate * vp.numberOfDays}\n`;
    csv += `Virtual Production,VP Studio,Environment Cost,${vp.numberOfEnvironments},${vp.environmentCost},1,${vp.environmentCost * vp.numberOfEnvironments}\n`;
    csv += `Virtual Production,VP Studio,Travel (+5%),1,${vp.travelCost},1,${Math.round(vp.travelCost * 1.05)}\n`;
    csv += `Virtual Production,VP Studio,MIS Costing,1,${vp.misCost},1,${vp.misCost}\n`;
    Object.entries(ext).forEach(([k, v]) => { if (v) csv += `Virtual Production,External Party,${k},1,${v},1,${v}\n`; });
    Object.entries(post).forEach(([k, v]) => { if (v) csv += `Virtual Production,Post Production,${k},1,${v},1,${v}\n`; });
    REG_SECTIONS.forEach(sec => {
      (regSections[sec.key] || []).forEach(item => {
        if (!item.enabled) return;
        const days = item.perDay ? regShootDays : 1;
        const sub = item.qty * item.rate * days;
        if (sub > 0) csv += `Regular Production,${sec.label},${item.name},${item.qty},${item.rate},${days},${Math.round(sub)}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${client.companyName || 'production'}_costing.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div data-testid="costing-calculator-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#F9982E]/10 rounded-lg"><IndianRupee size={22} className="text-[#F9982E]" /></div>
          <div>
            <h1 className="font-heading text-2xl font-black text-white tracking-tight" data-testid="costing-title">PRODUCTION COSTING</h1>
            <p className="text-xs text-[#52525B] font-data mt-0.5">Virtual + Regular production cost estimator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} data-testid="export-csv" className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#18181B] border border-[#232328] text-[#A1A1AA] hover:text-white hover:border-[#52525B] transition-all text-xs font-bold uppercase tracking-wider">
            <Download size={14} />Export CSV
          </button>
          <button onClick={reset} data-testid="costing-reset" className="p-2.5 rounded-lg bg-[#18181B] border border-[#232328] text-[#71717A] hover:text-white hover:border-[#52525B] transition-all" title="Reset All">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Client Details */}
      <div className="mb-5">
        <VPSection title="Client & Quotation Details" total={0} testId="section-client" defaultOpen={true} hideTotal={true}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4">
            <TextInput label="Person Name" value={client.personName} onChange={v => setClient({ ...client, personName: v })} testId="client-name" placeholder="Name" />
            <TextInput label="Company Name" value={client.companyName} onChange={v => setClient({ ...client, companyName: v })} testId="client-company" placeholder="Company" />
            <TextInput label="Email" value={client.email} onChange={v => setClient({ ...client, email: v })} testId="client-email" placeholder="email@example.com" type="email" />
            <TextInput label="Revision #" value={client.revisionNumber} onChange={v => setClient({ ...client, revisionNumber: v })} testId="client-revision" placeholder="1" />
            <TextInput label="Quotation Date" value={client.quotationDate} onChange={v => setClient({ ...client, quotationDate: v })} testId="client-date" type="date" />
          </div>
        </VPSection>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 mb-5 bg-[#0F0F0F] p-1 rounded-xl border border-[#232328] w-fit" data-testid="tab-switcher">
        <button onClick={() => setActiveTab('vp')} data-testid="tab-vp"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'vp' ? 'bg-[#F9982E] text-black' : 'text-[#71717A] hover:text-white hover:bg-[#18181B]'}`}>
          <Film size={16} />Virtual Production
        </button>
        <button onClick={() => setActiveTab('regular')} data-testid="tab-regular"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'regular' ? 'bg-emerald-500 text-black' : 'text-[#71717A] hover:text-white hover:bg-[#18181B]'}`}>
          <Clapperboard size={16} />Regular Production
        </button>
      </div>

      {/* VP Tab Content */}
      {activeTab === 'vp' && (
        <div className="space-y-4" data-testid="vp-content">
          <VPSection title="VP Studio" total={vpTotal} testId="section-vp">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <NumInput label="Per Day Rate" value={vp.perDayRate} onChange={v => setVp({ ...vp, perDayRate: v })} testId="vp-day-rate" />
                <CountInput label="Number of Days" value={vp.numberOfDays} onChange={v => setVp({ ...vp, numberOfDays: v })} testId="vp-days" />
                <SubTotal label="Production" amount={vp.perDayRate * vp.numberOfDays} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <NumInput label="Environment Cost / Unit" value={vp.environmentCost} onChange={v => setVp({ ...vp, environmentCost: v })} testId="vp-env-cost" />
                <CountInput label="No. of Environments" value={vp.numberOfEnvironments} onChange={v => setVp({ ...vp, numberOfEnvironments: v })} testId="vp-env-count" />
                <SubTotal label="Environments" amount={vp.environmentCost * vp.numberOfEnvironments} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <NumInput label="Travel Base Cost" value={vp.travelCost} onChange={v => setVp({ ...vp, travelCost: v })} testId="vp-travel" />
                <NumInput label="MIS Costing" value={vp.misCost} onChange={v => setVp({ ...vp, misCost: v })} testId="vp-mis" />
                <SubTotal label="Travel (+5% margin)" amount={vp.travelCost * 1.05} />
              </div>
            </div>
          </VPSection>

          <VPSection title="External Party" total={extTotal} testId="section-external" defaultOpen={false}>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <NumInput label="Composition / Shot" value={ext.compositionPerShot} onChange={v => setExt({ ...ext, compositionPerShot: v })} testId="ext-comp-rate" />
                <CountInput label="Number of Shots" value={ext.numberOfShots} onChange={v => setExt({ ...ext, numberOfShots: v })} testId="ext-comp-shots" />
                <SubTotal label="Composition" amount={extCompositionTotal} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <NumInput label="Director of Photography" value={ext.dop} onChange={v => setExt({ ...ext, dop: v })} testId="ext-dop" />
                <NumInput label="Light Rental" value={ext.lightRental} onChange={v => setExt({ ...ext, lightRental: v })} testId="ext-light" />
                <NumInput label="Lens Rental" value={ext.lensRental} onChange={v => setExt({ ...ext, lensRental: v })} testId="ext-lens" />
                <NumInput label="Hair & Makeup" value={ext.hairMakeup} onChange={v => setExt({ ...ext, hairMakeup: v })} testId="ext-hair" />
                <NumInput label="Art Decor" value={ext.artDecor} onChange={v => setExt({ ...ext, artDecor: v })} testId="ext-art-decor" />
                <NumInput label="Art Team" value={ext.artTeam} onChange={v => setExt({ ...ext, artTeam: v })} testId="ext-art-team" />
                <NumInput label="Producer" value={ext.producer} onChange={v => setExt({ ...ext, producer: v })} testId="ext-producer" />
                <NumInput label="Stylist" value={ext.stylist} onChange={v => setExt({ ...ext, stylist: v })} testId="ext-stylist" />
                <NumInput label="Creative Director" value={ext.creativeDirector} onChange={v => setExt({ ...ext, creativeDirector: v })} testId="ext-creative-dir" />
                <NumInput label="Director" value={ext.director} onChange={v => setExt({ ...ext, director: v })} testId="ext-director" />
                <NumInput label="Actor" value={ext.actor} onChange={v => setExt({ ...ext, actor: v })} testId="ext-actor" />
                <NumInput label="Logistics" value={ext.logistics} onChange={v => setExt({ ...ext, logistics: v })} testId="ext-logistics" />
              </div>
            </div>
          </VPSection>

          <VPSection title="Post Production" total={postTotal} testId="section-post" defaultOpen={false}>
            <div className="grid grid-cols-3 gap-3 pt-4">
              <NumInput label="Sound" value={post.sound} onChange={v => setPost({ ...post, sound: v })} testId="post-sound" />
              <NumInput label="Color" value={post.color} onChange={v => setPost({ ...post, color: v })} testId="post-color" />
              <NumInput label="Editing" value={post.editing} onChange={v => setPost({ ...post, editing: v })} testId="post-editing" />
            </div>
          </VPSection>

          {/* VP Subtotal */}
          <div className="bg-[#18181B] border border-[#F9982E]/30 rounded-xl p-5" data-testid="vp-subtotal">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#52525B] font-data uppercase block mb-1">Virtual Production Total</span>
                <span className="font-data text-3xl font-black text-[#F9982E]" data-testid="vp-total-value">{fmt(vpGrandTotal)}</span>
              </div>
              <CopyBtn text={vpGrandTotal.toString()} testId="copy-vp-total" />
            </div>
            {vpGrandTotal > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-[#0F0F0F] rounded-lg text-center"><span className="text-[10px] text-[#52525B] font-data block">STUDIO</span><span className="text-sm text-white font-data font-bold">{fmtShort(vpTotal)}</span></div>
                <div className="p-2.5 bg-[#0F0F0F] rounded-lg text-center"><span className="text-[10px] text-[#52525B] font-data block">EXTERNAL</span><span className="text-sm text-white font-data font-bold">{fmtShort(extTotal)}</span></div>
                <div className="p-2.5 bg-[#0F0F0F] rounded-lg text-center"><span className="text-[10px] text-[#52525B] font-data block">POST</span><span className="text-sm text-white font-data font-bold">{fmtShort(postTotal)}</span></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regular Production Tab Content */}
      {activeTab === 'regular' && (
        <div data-testid="reg-content">
          {/* Regular Production Header */}
          <div className="flex items-center justify-between mb-4 bg-[#18181B] border border-[#232328] rounded-xl px-5 py-4" data-testid="reg-header">
            <div className="flex items-center gap-3">
              <Clapperboard size={20} className="text-emerald-400" />
              <span className="text-base font-bold text-white uppercase tracking-wider">Regular Production Budget</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#71717A] font-data uppercase tracking-wider">Shoot Days</label>
                <input type="number" min="1" value={regShootDays} onChange={e => setRegShootDays(Math.max(1, parseInt(e.target.value) || 1))} data-testid="reg-shoot-days"
                  className="w-16 h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-base text-center font-data focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none" />
              </div>
              <div className="h-6 w-px bg-[#232328]" />
              <div className="text-right">
                <span className="text-[10px] text-[#52525B] font-data uppercase block">Budget Total</span>
                <span className="font-data text-lg font-black text-emerald-400">{fmtShort(regTotal)}</span>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {REG_SECTIONS.map(sec => (
              <RegSection key={sec.key} sectionKey={sec.key} label={sec.label} items={regSections[sec.key] || []}
                shootDays={regShootDays} onUpdate={updateRegSection} />
            ))}
          </div>

          {/* Regular Production Subtotal */}
          <div className="mt-4 bg-[#18181B] border border-emerald-500/30 rounded-xl p-5" data-testid="reg-subtotal">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#52525B] font-data uppercase block mb-1">Regular Production Total</span>
                <span className="font-data text-3xl font-black text-emerald-400" data-testid="reg-total-value">{fmt(regTotal)}</span>
              </div>
              <CopyBtn text={regTotal.toString()} testId="copy-reg-total" />
            </div>
            {regTotal > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {regSectionTotals.map(sec => (
                  <div key={sec.key} className="p-2.5 bg-[#0F0F0F] rounded-lg text-center">
                    <div className="w-2 h-2 rounded mx-auto mb-1.5" style={{ background: SECTION_COLORS[sec.key] }} />
                    <span className="text-[10px] text-[#52525B] font-data block">{sec.label.split(' & ')[0].toUpperCase()}</span>
                    <span className="text-sm text-white font-data font-bold">{fmtShort(sec.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Combined Grand Total - Always visible */}
      <div className="mt-6 bg-[#18181B] border-2 border-[#F9982E]/40 rounded-xl p-6" data-testid="grand-total-section">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[#52525B] font-data uppercase tracking-wider block mb-1">Combined Grand Total</span>
            <span className="font-data text-4xl font-black text-[#F9982E]" data-testid="grand-total-value">{fmt(combinedTotal)}</span>
          </div>
          <CopyBtn text={combinedTotal.toString()} testId="copy-grand-total" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => setActiveTab('vp')} data-testid="goto-vp"
            className={`p-4 rounded-lg flex items-center justify-between transition-all ${activeTab === 'vp' ? 'bg-[#F9982E]/10 border border-[#F9982E]/30' : 'bg-[#0F0F0F] border border-[#232328] hover:border-[#F9982E]/20'}`}>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-[#F9982E]" /><span className="text-sm text-[#A1A1AA] font-data">Virtual Production</span></div>
            <span className="text-base text-[#F9982E] font-data font-bold">{fmtShort(vpGrandTotal)}</span>
          </button>
          <button onClick={() => setActiveTab('regular')} data-testid="goto-regular"
            className={`p-4 rounded-lg flex items-center justify-between transition-all ${activeTab === 'regular' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-[#0F0F0F] border border-[#232328] hover:border-emerald-500/20'}`}>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-sm text-[#A1A1AA] font-data">Regular Production</span></div>
            <span className="text-base text-emerald-400 font-data font-bold">{fmtShort(regTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
