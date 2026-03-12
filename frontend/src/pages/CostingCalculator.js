import { useState } from 'react';
import { Calculator, Copy, Check, RotateCcw, ChevronDown, ChevronUp, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

function NumInput({ label, value, onChange, testId, placeholder = '0' }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider mb-1 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B] text-xs">&#8377;</span>
        <input
          type="number"
          data-testid={testId}
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          placeholder={placeholder}
          className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm pl-7 pr-3 focus:border-[#F9982E] focus:ring-1 focus:ring-[#F9982E]/30 outline-none transition-all placeholder:text-[#333] font-data"
        />
      </div>
    </div>
  );
}

function CountInput({ label, value, onChange, testId }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider mb-1 block">{label}</label>
      <input
        type="number"
        min="1"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 text-center focus:border-[#F9982E] focus:ring-1 focus:ring-[#F9982E]/30 outline-none transition-all font-data"
      />
    </div>
  );
}

function TextInput({ label, value, onChange, testId, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider mb-1 block">{label}</label>
      <input
        type={type}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 bg-[#0F0F0F] border border-[#232328] rounded-lg text-white text-sm px-3 focus:border-[#F9982E] focus:ring-1 focus:ring-[#F9982E]/30 outline-none transition-all placeholder:text-[#333]"
      />
    </div>
  );
}

function SubTotal({ label, amount }) {
  return (
    <div className="p-3 bg-[#0F0F0F] rounded-lg border border-[#232328] flex justify-between items-center">
      <span className="text-[10px] text-[#52525B] font-data uppercase">{label}</span>
      <span className="font-data text-sm text-[#F9982E] font-bold">{fmt(amount)}</span>
    </div>
  );
}

function Section({ title, total, children, testId, defaultOpen = true, hideTotal = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#18181B] border border-[#232328] rounded-xl overflow-hidden" data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1C1C1F] transition-colors"
        data-testid={`${testId}-toggle`}
      >
        <span className="text-sm font-bold text-white uppercase tracking-wider">{title}</span>
        <div className="flex items-center gap-3">
          {!hideTotal && <span className="font-data text-sm text-[#F9982E] font-bold">{fmt(total)}</span>}
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
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} data-testid={testId} className="p-1.5 rounded-md text-[#52525B] hover:text-[#F9982E] hover:bg-[#F9982E]/10 transition-all" title="Copy">
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

const INIT_CLIENT = { personName: '', companyName: '', revisionNumber: '1', email: '', quotationDate: new Date().toISOString().split('T')[0] };
const INIT_VP = { perDayRate: 0, numberOfDays: 1, environmentCost: 0, numberOfEnvironments: 1, travelCost: 0, misCost: 6000 };
const INIT_EXT = { compositionPerShot: 0, numberOfShots: 1, dop: 0, lightRental: 0, lensRental: 0, hairMakeup: 0, artDecor: 0, artTeam: 0, producer: 0, stylist: 0, creativeDirector: 0, director: 0, actor: 0, logistics: 0 };
const INIT_POST = { sound: 0, color: 0, editing: 0 };

export default function CostingCalculator() {
  const [client, setClient] = useState({ ...INIT_CLIENT });
  const [vp, setVp] = useState({ ...INIT_VP });
  const [ext, setExt] = useState({ ...INIT_EXT });
  const [post, setPost] = useState({ ...INIT_POST });

  const vpTotal = (vp.perDayRate * vp.numberOfDays) + (vp.environmentCost * vp.numberOfEnvironments) + (vp.travelCost * 1.05) + vp.misCost;
  const extCompositionTotal = ext.compositionPerShot * ext.numberOfShots;
  const extOtherTotal = ext.dop + ext.lightRental + ext.lensRental + ext.hairMakeup + ext.artDecor + ext.artTeam + ext.producer + ext.stylist + ext.creativeDirector + ext.director + ext.actor + ext.logistics;
  const extTotal = extCompositionTotal + extOtherTotal;
  const postTotal = post.sound + post.color + post.editing;
  const grandTotal = vpTotal + extTotal + postTotal;

  const reset = () => { setClient({ ...INIT_CLIENT }); setVp({ ...INIT_VP }); setExt({ ...INIT_EXT }); setPost({ ...INIT_POST }); toast.success('Calculator reset'); };

  return (
    <div data-testid="costing-calculator-page">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F9982E]/10 rounded-lg">
            <IndianRupee size={22} className="text-[#F9982E]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black text-white tracking-tight" data-testid="costing-title">PRODUCTION COSTING</h1>
            <p className="text-xs text-[#52525B] font-data mt-0.5">Virtual production cost estimator</p>
          </div>
        </div>
        <button onClick={reset} data-testid="costing-reset" className="p-2.5 rounded-lg bg-[#18181B] border border-[#232328] text-[#71717A] hover:text-white hover:border-[#52525B] transition-all" title="Reset All">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="max-w-3xl space-y-4">
        {/* Client Details */}
        <Section title="Client & Quotation Details" total={0} testId="section-client" defaultOpen={true} hideTotal={true}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4">
            <TextInput label="Person Name" value={client.personName} onChange={v => setClient({ ...client, personName: v })} testId="client-name" placeholder="Name" />
            <TextInput label="Company Name" value={client.companyName} onChange={v => setClient({ ...client, companyName: v })} testId="client-company" placeholder="Company" />
            <TextInput label="Email" value={client.email} onChange={v => setClient({ ...client, email: v })} testId="client-email" placeholder="email@example.com" type="email" />
            <TextInput label="Revision #" value={client.revisionNumber} onChange={v => setClient({ ...client, revisionNumber: v })} testId="client-revision" placeholder="1" />
            <TextInput label="Quotation Date" value={client.quotationDate} onChange={v => setClient({ ...client, quotationDate: v })} testId="client-date" type="date" />
          </div>
        </Section>

        {/* Virtual Production */}
        <Section title="Virtual Production" total={vpTotal} testId="section-vp">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumInput label="Travel Base Cost" value={vp.travelCost} onChange={v => setVp({ ...vp, travelCost: v })} testId="vp-travel" />
              <SubTotal label="Travel (+5% margin)" amount={vp.travelCost * 1.05} />
              <div className="grid grid-cols-1 gap-3">
                <NumInput label="MIS Costing" value={vp.misCost} onChange={v => setVp({ ...vp, misCost: v })} testId="vp-mis" />
              </div>
            </div>
          </div>
        </Section>

        {/* External Party */}
        <Section title="External Party" total={extTotal} testId="section-external">
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
        </Section>

        {/* Post Production */}
        <Section title="Post Production" total={postTotal} testId="section-post">
          <div className="grid grid-cols-3 gap-3 pt-4">
            <NumInput label="Sound" value={post.sound} onChange={v => setPost({ ...post, sound: v })} testId="post-sound" />
            <NumInput label="Color" value={post.color} onChange={v => setPost({ ...post, color: v })} testId="post-color" />
            <NumInput label="Editing" value={post.editing} onChange={v => setPost({ ...post, editing: v })} testId="post-editing" />
          </div>
        </Section>

        {/* Grand Total */}
        <div className="bg-[#18181B] border-2 border-[#F9982E]/30 rounded-xl p-6" data-testid="grand-total-section">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-[#52525B] font-data uppercase tracking-wider block mb-1">Grand Total</span>
              <span className="font-data text-4xl font-black text-[#F9982E]" data-testid="grand-total-value">{fmt(grandTotal)}</span>
            </div>
            <CopyBtn text={grandTotal.toString()} testId="copy-grand-total" />
          </div>
          {grandTotal > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="p-2 bg-[#0F0F0F] rounded-lg text-center">
                <span className="text-[9px] text-[#52525B] font-data block">VP</span>
                <span className="text-xs text-white font-data font-bold">{fmt(vpTotal)}</span>
              </div>
              <div className="p-2 bg-[#0F0F0F] rounded-lg text-center">
                <span className="text-[9px] text-[#52525B] font-data block">EXTERNAL</span>
                <span className="text-xs text-white font-data font-bold">{fmt(extTotal)}</span>
              </div>
              <div className="p-2 bg-[#0F0F0F] rounded-lg text-center">
                <span className="text-[9px] text-[#52525B] font-data block">POST</span>
                <span className="text-xs text-white font-data font-bold">{fmt(postTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
