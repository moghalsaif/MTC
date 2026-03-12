import { useState, useCallback } from 'react';
import { Calculator, Copy, Check, Plus, Minus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const FRAME_RATES = [
  { value: 16, label: '16 fps' },
  { value: 23.976, label: '23.976 fps' },
  { value: 24, label: '24 fps' },
  { value: 25, label: '25 fps' },
  { value: 29.97, label: '29.97 DF', dropFrame: true },
  { value: 30, label: '30 fps' },
  { value: 50, label: '50 fps' },
  { value: 59.94, label: '59.94 DF', dropFrame: true },
  { value: 60, label: '60 fps' },
];

function getMaxFrames(fps) {
  if (fps === 29.97 || fps === 59.94) return fps === 29.97 ? 29 : 59;
  return Math.ceil(fps) - 1;
}

function isDropFrame(fps) {
  return fps === 29.97 || fps === 59.94;
}

function timecodeToFrames(hh, mm, ss, ff, fps) {
  const h = parseInt(hh) || 0;
  const m = parseInt(mm) || 0;
  const s = parseInt(ss) || 0;
  const f = parseInt(ff) || 0;

  if (isDropFrame(fps)) {
    const nominalFps = Math.round(fps);
    const dropPerMin = fps === 29.97 ? 2 : 4;
    const framesPerHour = nominalFps * 3600;
    const framesPerMin = nominalFps * 60;
    const totalMinutes = h * 60 + m;
    const dropped = dropPerMin * (totalMinutes - Math.floor(totalMinutes / 10));
    return framesPerHour * h + framesPerMin * m + nominalFps * s + f - dropped;
  }

  const nominalFps = Math.ceil(fps);
  return nominalFps * 3600 * h + nominalFps * 60 * m + nominalFps * s + f;
}

function framesToTimecode(totalFrames, fps) {
  if (totalFrames < 0) return { hh: 0, mm: 0, ss: 0, ff: 0, negative: true, totalFrames: Math.abs(totalFrames) };

  const nominalFps = Math.round(fps);

  if (isDropFrame(fps)) {
    const dropPerMin = fps === 29.97 ? 2 : 4;
    const framesPerMin = nominalFps * 60 - dropPerMin;
    const framesPer10Min = framesPerMin * 10 + dropPerMin;

    let d = totalFrames;
    const tenMinBlocks = Math.floor(d / framesPer10Min);
    let rem = d % framesPer10Min;

    let extraMins = 0;
    if (rem >= nominalFps * 60) {
      rem -= nominalFps * 60;
      extraMins = 1;
      extraMins += Math.floor(rem / framesPerMin);
      rem = rem % framesPerMin;
      rem += dropPerMin;
    }

    const totalMinutes = tenMinBlocks * 10 + extraMins;
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    const ss = Math.floor(rem / nominalFps);
    const ff = rem % nominalFps;

    return { hh, mm, ss, ff, negative: false, totalFrames };
  }

  const nomFps = Math.ceil(fps);
  const hh = Math.floor(totalFrames / (nomFps * 3600));
  let remainder = totalFrames % (nomFps * 3600);
  const mm = Math.floor(remainder / (nomFps * 60));
  remainder = remainder % (nomFps * 60);
  const ss = Math.floor(remainder / nomFps);
  const ff = remainder % nomFps;

  return { hh, mm, ss, ff, negative: false, totalFrames };
}

function framesToSeconds(totalFrames, fps) {
  const actualFps = fps === 29.97 ? 30000 / 1001 : fps === 59.94 ? 60000 / 1001 : fps;
  return totalFrames / actualFps;
}

function TCInput({ label, values, onChange, maxFF, testIdPrefix }) {
  const fields = [
    { key: 'hh', max: 23, placeholder: 'HH', width: 'w-[68px]' },
    { key: 'mm', max: 59, placeholder: 'MM', width: 'w-[68px]' },
    { key: 'ss', max: 59, placeholder: 'SS', width: 'w-[68px]' },
    { key: 'ff', max: maxFF, placeholder: 'FF', width: 'w-[68px]' },
  ];

  const handleChange = (key, val, max) => {
    const num = val.replace(/\D/g, '');
    if (num === '') { onChange({ ...values, [key]: '' }); return; }
    const clamped = Math.min(parseInt(num), max);
    onChange({ ...values, [key]: String(clamped) });
  };

  const handleBlur = (key) => {
    const v = values[key];
    if (v === '' || v === undefined) onChange({ ...values, [key]: '0' });
  };

  return (
    <div>
      <span className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2 block">{label}</span>
      <div className="flex items-center gap-1">
        {fields.map((f, i) => (
          <div key={f.key} className="flex items-center">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                data-testid={`${testIdPrefix}-${f.key}`}
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value, f.max)}
                onBlur={() => handleBlur(f.key)}
                onFocus={(e) => e.target.select()}
                placeholder={f.placeholder}
                className={`${f.width} h-12 bg-[#0F0F0F] border border-[#232328] rounded-lg text-center text-white font-data text-lg focus:border-[#F9982E] focus:ring-1 focus:ring-[#F9982E]/30 outline-none transition-all placeholder:text-[#333]`}
              />
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] text-[#52525B] font-data bg-[#18181B] px-1">{f.placeholder}</span>
            </div>
            {i < fields.length - 1 && <span className="text-[#52525B] font-data text-lg mx-0.5">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text, label, testId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      data-testid={testId}
      className="p-1.5 rounded-md text-[#52525B] hover:text-[#F9982E] hover:bg-[#F9982E]/10 transition-all"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

export default function TimecodeCalculator() {
  const [frameRate, setFrameRate] = useState(24);
  const [tc1, setTc1] = useState({ hh: '0', mm: '0', ss: '0', ff: '0' });
  const [tc2, setTc2] = useState({ hh: '0', mm: '0', ss: '0', ff: '0' });
  const [operation, setOperation] = useState('add');
  const [result, setResult] = useState(null);

  const maxFF = getMaxFrames(frameRate);

  const clampFF = useCallback((tc) => {
    const ff = parseInt(tc.ff) || 0;
    if (ff > maxFF) return { ...tc, ff: String(maxFF) };
    return tc;
  }, [maxFF]);

  const handleFrameRateChange = (newFps) => {
    setFrameRate(newFps);
    const newMax = getMaxFrames(newFps);
    setTc1(prev => {
      const ff = parseInt(prev.ff) || 0;
      return ff > newMax ? { ...prev, ff: String(newMax) } : prev;
    });
    setTc2(prev => {
      const ff = parseInt(prev.ff) || 0;
      return ff > newMax ? { ...prev, ff: String(newMax) } : prev;
    });
    setResult(null);
  };

  const calculate = () => {
    const clamped1 = clampFF(tc1);
    const clamped2 = clampFF(tc2);
    const frames1 = timecodeToFrames(clamped1.hh, clamped1.mm, clamped1.ss, clamped1.ff, frameRate);
    const frames2 = timecodeToFrames(clamped2.hh, clamped2.mm, clamped2.ss, clamped2.ff, frameRate);

    const totalFrames = operation === 'add' ? frames1 + frames2 : frames1 - frames2;
    const tc = framesToTimecode(Math.abs(totalFrames), frameRate);
    const seconds = framesToSeconds(Math.abs(totalFrames), frameRate);

    setResult({
      ...tc,
      negative: totalFrames < 0,
      totalFrames: Math.abs(totalFrames),
      seconds: seconds,
    });
  };

  const reset = () => {
    setTc1({ hh: '0', mm: '0', ss: '0', ff: '0' });
    setTc2({ hh: '0', mm: '0', ss: '0', ff: '0' });
    setResult(null);
  };

  const pad = (n) => String(n).padStart(2, '0');
  const resultTC = result ? `${result.negative ? '-' : ''}${pad(result.hh)}:${pad(result.mm)}:${pad(result.ss)}:${pad(result.ff)}` : null;
  const resultFrames = result ? String(result.totalFrames) : null;
  const resultSeconds = result ? result.seconds.toFixed(3) : null;
  const selectedRate = FRAME_RATES.find(r => r.value === frameRate);

  return (
    <div data-testid="timecode-calculator-page">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-[#F9982E]/10 rounded-lg">
          <Calculator size={22} className="text-[#F9982E]" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-black text-white tracking-tight" data-testid="calculator-title">TIMECODE CALCULATOR</h1>
          <p className="text-xs text-[#52525B] font-data mt-0.5">Add or subtract SMPTE timecodes</p>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Frame Rate Selector */}
        <div className="mb-6">
          <span className="text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2 block">Frame Rate</span>
          <div className="flex flex-wrap gap-1.5" data-testid="frame-rate-selector">
            {FRAME_RATES.map(rate => (
              <button
                key={rate.value}
                onClick={() => handleFrameRateChange(rate.value)}
                data-testid={`fps-${rate.value}`}
                className={`px-3 py-1.5 rounded-md text-xs font-data font-medium transition-all ${
                  frameRate === rate.value
                    ? 'bg-[#F9982E] text-black'
                    : 'bg-[#18181B] border border-[#232328] text-[#A1A1AA] hover:border-[#F9982E]/40 hover:text-white'
                }`}
              >
                {rate.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculator Body */}
        <div className="bg-[#18181B] border border-[#232328] rounded-xl p-6 space-y-5">
          {/* Timecode 1 */}
          <TCInput label="Timecode 1" values={tc1} onChange={setTc1} maxFF={maxFF} testIdPrefix="tc1" />

          {/* Operation Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#71717A] uppercase tracking-wider">Operation</span>
            <div className="flex bg-[#0F0F0F] rounded-lg p-1 border border-[#232328]" data-testid="operation-toggle">
              <button
                onClick={() => { setOperation('add'); setResult(null); }}
                data-testid="operation-add"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  operation === 'add'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-[#52525B] hover:text-[#A1A1AA] border border-transparent'
                }`}
              >
                <Plus size={16} strokeWidth={3} />
                <span>ADD</span>
              </button>
              <button
                onClick={() => { setOperation('subtract'); setResult(null); }}
                data-testid="operation-subtract"
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  operation === 'subtract'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'text-[#52525B] hover:text-[#A1A1AA] border border-transparent'
                }`}
              >
                <Minus size={16} strokeWidth={3} />
                <span>SUB</span>
              </button>
            </div>
          </div>

          {/* Timecode 2 */}
          <TCInput label="Timecode 2" values={tc2} onChange={setTc2} maxFF={maxFF} testIdPrefix="tc2" />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={calculate}
              data-testid="calculate-button"
              className={`flex-1 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                operation === 'add'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  : 'bg-red-500 hover:bg-red-400 text-white'
              }`}
            >
              {operation === 'add' ? 'Add Timecodes' : 'Subtract Timecodes'}
            </button>
            <button
              onClick={reset}
              data-testid="reset-button"
              className="p-3 rounded-lg bg-[#0F0F0F] border border-[#232328] text-[#71717A] hover:text-white hover:border-[#52525B] transition-all"
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-4 bg-[#18181B] border border-[#232328] rounded-xl p-6 space-y-4" data-testid="result-section">
            <span className="text-xs font-medium text-[#71717A] uppercase tracking-wider">Result</span>

            {/* Timecode Result */}
            <div className="flex items-center justify-between bg-[#0F0F0F] rounded-lg p-4 border border-[#232328]">
              <div>
                <span className="text-[10px] text-[#52525B] font-data block mb-1">TIMECODE</span>
                <span className="font-data text-2xl text-white tracking-wide" data-testid="result-timecode">
                  {result.negative && <span className="text-red-400">-</span>}
                  <span className="text-[#F9982E]">{pad(result.hh)}</span>
                  <span className="text-[#52525B]">:</span>
                  <span className="text-[#F9982E]">{pad(result.mm)}</span>
                  <span className="text-[#52525B]">:</span>
                  <span className="text-[#F9982E]">{pad(result.ss)}</span>
                  <span className="text-[#52525B]">:</span>
                  <span className="text-[#F9982E]">{pad(result.ff)}</span>
                </span>
              </div>
              <CopyButton text={resultTC} label="Timecode" testId="copy-timecode" />
            </div>

            {/* Frames + Seconds */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between bg-[#0F0F0F] rounded-lg p-4 border border-[#232328]">
                <div>
                  <span className="text-[10px] text-[#52525B] font-data block mb-1">TOTAL FRAMES</span>
                  <span className="font-data text-lg text-white" data-testid="result-frames">{result.totalFrames.toLocaleString()}</span>
                </div>
                <CopyButton text={resultFrames} label="Frames" testId="copy-frames" />
              </div>
              <div className="flex items-center justify-between bg-[#0F0F0F] rounded-lg p-4 border border-[#232328]">
                <div>
                  <span className="text-[10px] text-[#52525B] font-data block mb-1">SECONDS</span>
                  <span className="font-data text-lg text-white" data-testid="result-seconds">{resultSeconds}</span>
                </div>
                <CopyButton text={resultSeconds} label="Seconds" testId="copy-seconds" />
              </div>
            </div>

            {/* Info */}
            <div className="text-[10px] text-[#52525B] font-data flex items-center gap-2 pt-1">
              <span>Frame rate: {selectedRate?.label}</span>
              {isDropFrame(frameRate) && <span className="text-amber-500/60">Drop-frame</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
