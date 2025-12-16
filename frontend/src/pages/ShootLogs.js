import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  Plus, FileSpreadsheet, Download, Filter, Trash2, Pencil, Copy, Lock, Unlock, 
  ChevronDown, ChevronRight, Eye, EyeOff, Save, X, Search, SortAsc, SortDesc,
  Layers, Calendar, User, Clapperboard, MoreHorizontal, Check, Circle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Column definitions with exact order from requirements
const COLUMNS = [
  { key: 'scene_no', label: 'Scene No', width: 80, type: 'text' },
  { key: 'shot_no', label: 'Shot No', width: 70, type: 'text' },
  { key: 'shot_description', label: 'Shot Description', width: 200, type: 'text' },
  { key: 'ki_pro_take_name', label: 'KI Pro Take', width: 120, type: 'text' },
  { key: 'camera_footage_name', label: 'Camera Footage', width: 140, type: 'text' },
  { key: 'go_ng', label: 'Go/NG', width: 70, type: 'dropdown', options: ['Go', 'NG'] },
  { key: 'notes', label: 'Notes', width: 180, type: 'text' },
  { key: 'physical_lens', label: 'Physical Lens', width: 100, type: 'text' },
  { key: 'virtual_lens', label: 'Virtual Lens', width: 100, type: 'text' },
  { key: 'white_balance', label: 'White Balance', width: 100, type: 'text' },
  { key: 'iso', label: 'ISO', width: 70, type: 'number' },
  { key: 'aperture', label: 'Aperture', width: 80, type: 'number' },
  { key: 'shutter', label: 'Shutter', width: 80, type: 'text' },
  { key: 'shoot_time', label: 'Shoot Time', width: 100, type: 'timecode' },
  { key: 'physical_elements', label: 'Physical Elements', width: 150, type: 'text' },
  { key: 'int_ext', label: 'INT/EXT', width: 80, type: 'dropdown', options: ['INT', 'EXT'] },
  { key: 'camera_focal_distance', label: 'Focal Distance', width: 100, type: 'text' },
  { key: 'camera_height', label: 'Camera Height', width: 100, type: 'text' },
  { key: 'resolution', label: 'Resolution', width: 100, type: 'dropdown', options: ['4K (3840x2160)', '4K DCI (4096x2160)', '2K (2048x1080)', '1080p (1920x1080)', '1080p Vertical (1080x1920)', '4K Vertical (2160x3840)', 'Custom'] },
  { key: 'fps', label: 'FPS', width: 70, type: 'dropdown', options: ['24', '25', '30', '48', '50', '60', '120'] },
  { key: 'ue_environment_name', label: 'UE Environment', width: 140, type: 'text' },
  { key: 'camera_angle', label: 'Camera Angle', width: 100, type: 'dropdown', options: ['Wide', 'Mid', 'Close', 'POV', 'Custom'] },
  { key: 'shoot_downtime', label: 'Downtime (min)', width: 100, type: 'number' },
  { key: 'timecode_in', label: 'TC In', width: 100, type: 'timecode' },
  { key: 'timecode_out', label: 'TC Out', width: 100, type: 'timecode' },
  { key: 'ready_for_render', label: 'Ready Render', width: 90, type: 'checkbox' },
  { key: 'ready_for_comp', label: 'Ready Comp', width: 90, type: 'checkbox' },
  { key: 'comp_artist', label: 'Comp Artist', width: 120, type: 'text' },
];

export default function ShootLogs() {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowHeight, setRowHeight] = useState('medium'); // small, medium, large
  const [columnWidths, setColumnWidths] = useState({});
  
  // Dialogs
  const [createSheetDialog, setCreateSheetDialog] = useState(false);
  const [editSheetDialog, setEditSheetDialog] = useState(false);
  const [filterDialog, setFilterDialog] = useState(false);
  
  // Sheet form
  const [sheetForm, setSheetForm] = useState({
    name: '', project_name: '', project_date: '', director: '',
    total_shoot_days: '', current_shoot_day: '', log_artist: '',
    production_company: '', duplicate_from: ''
  });
  
  // Filters
  const [filters, setFilters] = useState({
    scene_no: '', shot_no: '', go_ng: '', int_ext: '',
    ready_for_render: '', ready_for_comp: '', ue_environment_name: '', comp_artist: ''
  });
  const [activeFilters, setActiveFilters] = useState({});
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Grouping
  const [groupBy, setGroupBy] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  
  // Editing
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef(null);
  
  // Auto-save timer
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    fetchSheets();
  }, []);

  useEffect(() => {
    if (selectedSheet) {
      fetchEntries();
    }
  }, [selectedSheet, activeFilters, sortConfig, groupBy]);

  useEffect(() => {
    // Initialize column widths
    const widths = {};
    COLUMNS.forEach(col => {
      widths[col.key] = col.width;
    });
    setColumnWidths(widths);
  }, []);

  const fetchSheets = async () => {
    try {
      const response = await axios.get(`${API}/log-sheets`);
      setSheets(response.data);
      if (response.data.length > 0 && !selectedSheet) {
        setSelectedSheet(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch sheets:', error);
      toast.error('Failed to load shoot logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    if (!selectedSheet) return;
    
    try {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          params.append(key, value);
        }
      });
      if (sortConfig.key) {
        params.append('sort_by', sortConfig.key);
        params.append('sort_order', sortConfig.direction);
      }
      if (groupBy) {
        params.append('group_by', groupBy);
      }
      
      const response = await axios.get(`${API}/log-sheets/${selectedSheet.id}/entries?${params}`);
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
      toast.error('Failed to load log entries');
    }
  };

  const handleCreateSheet = async () => {
    if (!sheetForm.name || !sheetForm.project_name || !sheetForm.project_date || !sheetForm.log_artist) {
      toast.error('Please fill in required fields');
      return;
    }
    
    try {
      const data = {
        ...sheetForm,
        total_shoot_days: sheetForm.total_shoot_days ? parseInt(sheetForm.total_shoot_days) : null,
        current_shoot_day: sheetForm.current_shoot_day ? parseInt(sheetForm.current_shoot_day) : null,
        duplicate_from: sheetForm.duplicate_from || null
      };
      
      const response = await axios.post(`${API}/log-sheets`, data);
      toast.success('Shoot log created');
      setCreateSheetDialog(false);
      resetSheetForm();
      fetchSheets();
      setSelectedSheet(response.data);
    } catch (error) {
      toast.error('Failed to create shoot log');
    }
  };

  const handleUpdateSheet = async () => {
    if (!selectedSheet) return;
    
    try {
      const data = {
        ...sheetForm,
        total_shoot_days: sheetForm.total_shoot_days ? parseInt(sheetForm.total_shoot_days) : null,
        current_shoot_day: sheetForm.current_shoot_day ? parseInt(sheetForm.current_shoot_day) : null
      };
      delete data.duplicate_from;
      
      await axios.put(`${API}/log-sheets/${selectedSheet.id}`, data);
      toast.success('Shoot log updated');
      setEditSheetDialog(false);
      fetchSheets();
    } catch (error) {
      toast.error('Failed to update shoot log');
    }
  };

  const handleDeleteSheet = async (sheetId) => {
    if (!window.confirm('Delete this shoot log and all its entries? This cannot be undone.')) return;
    
    try {
      await axios.delete(`${API}/log-sheets/${sheetId}`);
      toast.success('Shoot log deleted');
      if (selectedSheet?.id === sheetId) {
        setSelectedSheet(null);
        setEntries([]);
      }
      fetchSheets();
    } catch (error) {
      toast.error('Failed to delete shoot log');
    }
  };

  const handleToggleLock = async () => {
    if (!selectedSheet) return;
    
    try {
      await axios.put(`${API}/log-sheets/${selectedSheet.id}`, {
        is_locked: !selectedSheet.is_locked
      });
      toast.success(selectedSheet.is_locked ? 'Sheet unlocked' : 'Sheet locked');
      fetchSheets();
      setSelectedSheet(prev => ({ ...prev, is_locked: !prev.is_locked }));
    } catch (error) {
      toast.error('Failed to toggle lock');
    }
  };

  const handleAddEntry = async () => {
    if (!selectedSheet) return;
    
    if (selectedSheet.is_locked) {
      toast.error('This sheet is locked');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/log-sheets/${selectedSheet.id}/entries`, {
        sheet_id: selectedSheet.id
      });
      toast.success('Row added');
      fetchEntries();
    } catch (error) {
      toast.error('Failed to add row');
    }
  };

  const handleCellEdit = (entryId, columnKey, value) => {
    setEditingCell({ entryId, columnKey });
    setEditValue(value || '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    
    const { entryId, columnKey } = editingCell;
    const column = COLUMNS.find(c => c.key === columnKey);
    
    let valueToSave = editValue;
    if (column?.type === 'number') {
      valueToSave = editValue === '' ? null : parseFloat(editValue);
    } else if (column?.type === 'checkbox') {
      valueToSave = editValue === true || editValue === 'true';
    }
    
    try {
      await axios.put(`${API}/log-entries/${entryId}`, {
        [columnKey]: valueToSave
      });
      
      // Update local state
      if (entries.grouped) {
        const newGroups = { ...entries.groups };
        Object.keys(newGroups).forEach(group => {
          newGroups[group] = newGroups[group].map(entry => 
            entry.id === entryId ? { ...entry, [columnKey]: valueToSave } : entry
          );
        });
        setEntries({ ...entries, groups: newGroups });
      } else {
        setEntries(prev => ({
          ...prev,
          entries: prev.entries.map(entry =>
            entry.id === entryId ? { ...entry, [columnKey]: valueToSave } : entry
          )
        }));
      }
    } catch (error) {
      toast.error('Failed to save');
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await axios.delete(`${API}/log-entries/${entryId}`);
      toast.success('Row deleted');
      fetchEntries();
    } catch (error) {
      toast.error('Failed to delete row');
    }
  };

  const handleExport = async (format) => {
    if (!selectedSheet) return;
    
    try {
      const response = await axios.get(
        `${API}/log-sheets/${selectedSheet.id}/export/${format}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedSheet.name}_${selectedSheet.project_date}.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const applyFilters = () => {
    const active = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        active[key] = value;
      }
    });
    setActiveFilters(active);
    setFilterDialog(false);
  };

  const clearFilters = () => {
    setFilters({
      scene_no: '', shot_no: '', go_ng: '', int_ext: '',
      ready_for_render: '', ready_for_comp: '', ue_environment_name: '', comp_artist: ''
    });
    setActiveFilters({});
    setFilterDialog(false);
  };

  const resetSheetForm = () => {
    setSheetForm({
      name: '', project_name: '', project_date: '', director: '',
      total_shoot_days: '', current_shoot_day: '', log_artist: '',
      production_company: '', duplicate_from: ''
    });
  };

  const openEditSheet = () => {
    if (!selectedSheet) return;
    setSheetForm({
      name: selectedSheet.name,
      project_name: selectedSheet.project_name,
      project_date: selectedSheet.project_date,
      director: selectedSheet.director || '',
      total_shoot_days: selectedSheet.total_shoot_days?.toString() || '',
      current_shoot_day: selectedSheet.current_shoot_day?.toString() || '',
      log_artist: selectedSheet.log_artist,
      production_company: selectedSheet.production_company || '',
      duplicate_from: ''
    });
    setEditSheetDialog(true);
  };

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getRowHeightClass = () => {
    switch (rowHeight) {
      case 'small': return 'h-8';
      case 'large': return 'h-14';
      default: return 'h-10';
    }
  };

  const getRowStyle = (entry) => {
    if (entry.go_ng === 'Go') return 'bg-emerald-950/30 border-l-2 border-l-emerald-500';
    if (entry.go_ng === 'NG') return 'bg-red-950/30 border-l-2 border-l-red-500';
    if (entry.shoot_downtime > 10) return 'bg-yellow-950/30 border-l-2 border-l-yellow-500';
    return '';
  };

  const renderCell = (entry, column) => {
    const isEditing = editingCell?.entryId === entry.id && editingCell?.columnKey === column.key;
    const value = entry[column.key];
    
    if (isEditing) {
      if (column.type === 'dropdown') {
        return (
          <select
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellSave}
            onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
            className="w-full h-full bg-[#1B1B1B] border border-[#F9982E] text-white text-xs px-1 outline-none"
          >
            <option value="">--</option>
            {column.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      
      if (column.type === 'checkbox') {
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={editValue === true || editValue === 'true'}
              onChange={(e) => {
                setEditValue(e.target.checked);
                setTimeout(handleCellSave, 100);
              }}
              className="w-4 h-4 accent-[#F9982E]"
            />
          </div>
        );
      }
      
      return (
        <input
          ref={editInputRef}
          type={column.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCellSave();
            if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
          }}
          className="w-full h-full bg-[#1B1B1B] border border-[#F9982E] text-white text-xs px-1 outline-none"
        />
      );
    }
    
    // Display mode
    if (column.type === 'checkbox') {
      return (
        <div 
          className="flex items-center justify-center cursor-pointer"
          onClick={() => handleCellEdit(entry.id, column.key, value)}
        >
          {value ? (
            <div className={`w-3 h-3 rounded-full ${column.key === 'ready_for_render' ? 'bg-blue-500' : 'bg-purple-500'}`} />
          ) : (
            <Circle size={12} className="text-[#3F3F46]" />
          )}
        </div>
      );
    }
    
    return (
      <div
        className="truncate cursor-pointer px-2 py-1 hover:bg-[#3F3F46]/30"
        onClick={() => !selectedSheet?.is_locked && handleCellEdit(entry.id, column.key, value)}
        title={value || ''}
      >
        {value || <span className="text-[#52525B]">—</span>}
      </div>
    );
  };

  const renderEntries = () => {
    if (entries.grouped) {
      return Object.entries(entries.groups).map(([groupKey, groupEntries]) => (
        <div key={groupKey}>
          <div 
            className="flex items-center gap-2 bg-[#3F3F46] px-3 py-2 cursor-pointer sticky left-0"
            onClick={() => toggleGroupCollapse(groupKey)}
          >
            {collapsedGroups[groupKey] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span className="font-medium text-white text-sm">{groupKey}</span>
            <span className="text-[#71717A] text-xs">({groupEntries.length})</span>
          </div>
          {!collapsedGroups[groupKey] && groupEntries.map(entry => renderRow(entry))}
        </div>
      ));
    }
    
    return entries.entries?.map(entry => renderRow(entry));
  };

  const renderRow = (entry) => (
    <div 
      key={entry.id} 
      className={`flex border-b border-[#3F3F46]/50 ${getRowHeightClass()} ${getRowStyle(entry)} hover:bg-[#27272A]/50`}
    >
      {COLUMNS.map(column => (
        <div
          key={column.key}
          className="flex-shrink-0 border-r border-[#3F3F46]/30 flex items-center text-xs text-white"
          style={{ width: columnWidths[column.key] || column.width }}
        >
          {renderCell(entry, column)}
        </div>
      ))}
      <div className="flex-shrink-0 w-12 flex items-center justify-center">
        {!selectedSheet?.is_locked && (
          <button
            onClick={() => handleDeleteEntry(entry.id)}
            className="p-1 text-[#EF4444] hover:bg-[#EF4444]/20 rounded"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING SHOOT LOGS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-black text-white tracking-tight">SHOOT LOGS</h1>
          <p className="text-[#71717A] text-sm">Production logging for virtual and physical shoots</p>
        </div>
        <Button
          onClick={() => { resetSheetForm(); setCreateSheetDialog(true); }}
          className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold rounded-xl"
        >
          <Plus size={16} className="mr-2" />
          New Shoot Log
        </Button>
      </div>

      {/* Sheet Tabs */}
      {sheets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {sheets.filter(s => s.is_visible !== false).map(sheet => (
            <button
              key={sheet.id}
              onClick={() => setSelectedSheet(sheet)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedSheet?.id === sheet.id
                  ? 'bg-[#F9982E] text-black'
                  : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-white'
              }`}
            >
              <FileSpreadsheet size={14} />
              {sheet.name}
              {sheet.is_locked && <Lock size={12} />}
              <span className="text-xs opacity-70">({sheet.entry_count || 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Sheet Info & Actions */}
      {selectedSheet && (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-white font-bold text-lg">{selectedSheet.project_name}</div>
                <div className="flex items-center gap-4 text-xs text-[#71717A] mt-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {selectedSheet.project_date}</span>
                  {selectedSheet.director && <span className="flex items-center gap-1"><Clapperboard size={12} /> {selectedSheet.director}</span>}
                  <span className="flex items-center gap-1"><User size={12} /> {selectedSheet.log_artist}</span>
                  {selectedSheet.current_shoot_day && (
                    <span>Day {selectedSheet.current_shoot_day}/{selectedSheet.total_shoot_days || '?'}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Row Height Toggle */}
              <div className="flex items-center gap-1 bg-[#1B1B1B] rounded-lg p-1">
                {['small', 'medium', 'large'].map(size => (
                  <button
                    key={size}
                    onClick={() => setRowHeight(size)}
                    className={`px-2 py-1 rounded text-xs ${rowHeight === size ? 'bg-[#F9982E] text-black' : 'text-[#71717A]'}`}
                  >
                    {size.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
              
              {/* Group By */}
              <Select value={groupBy || 'none'} onValueChange={(v) => setGroupBy(v === 'none' ? null : v)}>
                <SelectTrigger className="w-[140px] bg-[#1B1B1B] border-[#3F3F46] h-8 text-xs">
                  <Layers size={12} className="mr-1" />
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="scene_no">Scene</SelectItem>
                  <SelectItem value="int_ext">INT/EXT</SelectItem>
                  <SelectItem value="ue_environment_name">UE Environment</SelectItem>
                  <SelectItem value="comp_artist">Comp Artist</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Filter */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterDialog(true)}
                className={`bg-[#1B1B1B] border-[#3F3F46] text-white h-8 ${Object.keys(activeFilters).length > 0 ? 'border-[#F9982E]' : ''}`}
              >
                <Filter size={12} className="mr-1" />
                Filter {Object.keys(activeFilters).length > 0 && `(${Object.keys(activeFilters).length})`}
              </Button>
              
              {/* Lock/Unlock */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleLock}
                className="bg-[#1B1B1B] border-[#3F3F46] text-white h-8"
              >
                {selectedSheet.is_locked ? <Lock size={12} /> : <Unlock size={12} />}
              </Button>
              
              {/* Edit Sheet */}
              <Button
                variant="outline"
                size="sm"
                onClick={openEditSheet}
                className="bg-[#1B1B1B] border-[#3F3F46] text-white h-8"
              >
                <Pencil size={12} />
              </Button>
              
              {/* Export */}
              <div className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#1B1B1B] border-[#3F3F46] text-white h-8"
                >
                  <Download size={12} className="mr-1" />
                  Export
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-[#27272A] border border-[#3F3F46] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button onClick={() => handleExport('csv')} className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3F3F46]">CSV</button>
                  <button onClick={() => handleExport('excel')} className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3F3F46]">Excel</button>
                </div>
              </div>
              
              {/* Delete Sheet */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteSheet(selectedSheet.id)}
                className="bg-[#1B1B1B] border-[#3F3F46] text-[#EF4444] hover:bg-[#EF4444]/10 h-8"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      {selectedSheet ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl overflow-hidden flex-1">
          {/* Add Row Button */}
          {!selectedSheet.is_locked && (
            <div className="border-b border-[#3F3F46] px-3 py-2">
              <Button
                onClick={handleAddEntry}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
              >
                <Plus size={12} className="mr-1" />
                Add Row
              </Button>
            </div>
          )}
          
          <div className="overflow-auto max-h-[calc(100vh-380px)]">
            {/* Header */}
            <div className="flex bg-[#1B1B1B] border-b border-[#3F3F46] sticky top-0 z-20">
              {COLUMNS.map(column => (
                <div
                  key={column.key}
                  className="flex-shrink-0 border-r border-[#3F3F46]/30 px-2 py-2 flex items-center justify-between cursor-pointer hover:bg-[#27272A]"
                  style={{ width: columnWidths[column.key] || column.width }}
                  onClick={() => handleSort(column.key)}
                >
                  <span className="text-[10px] font-medium text-[#A1A1AA] uppercase truncate">{column.label}</span>
                  {sortConfig.key === column.key && (
                    sortConfig.direction === 'asc' ? <SortAsc size={10} className="text-[#F9982E]" /> : <SortDesc size={10} className="text-[#F9982E]" />
                  )}
                </div>
              ))}
              <div className="flex-shrink-0 w-12 px-2 py-2 text-[10px] font-medium text-[#A1A1AA] uppercase">
                Del
              </div>
            </div>
            
            {/* Body */}
            <div>
              {entries.entries?.length > 0 || entries.grouped ? (
                renderEntries()
              ) : (
                <div className="text-center py-12 text-[#71717A]">
                  <FileSpreadsheet size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No entries yet</p>
                  <p className="text-sm">Click "Add Row" to start logging</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Color Legend */}
          <div className="border-t border-[#3F3F46] px-4 py-2 flex items-center gap-6 text-xs text-[#71717A]">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded" /> Go</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded" /> NG</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded" /> Downtime &gt;10min</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full" /> Ready for Render</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-full" /> Ready for Comp</span>
          </div>
        </div>
      ) : (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-12 text-center">
          <FileSpreadsheet size={48} className="mx-auto text-[#71717A] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No shoot logs yet</div>
          <div className="text-[#A1A1AA] mb-4">Create your first shoot log to start tracking</div>
          <Button
            onClick={() => { resetSheetForm(); setCreateSheetDialog(true); }}
            className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold"
          >
            <Plus size={16} className="mr-2" />
            Create Shoot Log
          </Button>
        </div>
      )}

      {/* Create Sheet Dialog */}
      <Dialog open={createSheetDialog} onOpenChange={setCreateSheetDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">CREATE SHOOT LOG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Sheet Name *</Label>
                <Input
                  value={sheetForm.name}
                  onChange={(e) => setSheetForm({ ...sheetForm, name: e.target.value })}
                  placeholder="e.g., Day 01, Scene 12"
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Project Name *</Label>
                <Input
                  value={sheetForm.project_name}
                  onChange={(e) => setSheetForm({ ...sheetForm, project_name: e.target.value })}
                  placeholder="Film / Project title"
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Project Date *</Label>
                <Input
                  type="date"
                  value={sheetForm.project_date}
                  onChange={(e) => setSheetForm({ ...sheetForm, project_date: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Director</Label>
                <Input
                  value={sheetForm.director}
                  onChange={(e) => setSheetForm({ ...sheetForm, director: e.target.value })}
                  placeholder="Director name"
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Total Shoot Days</Label>
                <Input
                  type="number"
                  value={sheetForm.total_shoot_days}
                  onChange={(e) => setSheetForm({ ...sheetForm, total_shoot_days: e.target.value })}
                  placeholder="e.g., 30"
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Current Day</Label>
                <Input
                  type="number"
                  value={sheetForm.current_shoot_day}
                  onChange={(e) => setSheetForm({ ...sheetForm, current_shoot_day: e.target.value })}
                  placeholder="e.g., 5"
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Log Artist *</Label>
                <Input
                  value={sheetForm.log_artist}
                  onChange={(e) => setSheetForm({ ...sheetForm, log_artist: e.target.value })}
                  placeholder="Your name"
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Production Company</Label>
              <Input
                value={sheetForm.production_company}
                onChange={(e) => setSheetForm({ ...sheetForm, production_company: e.target.value })}
                placeholder="Company name"
                className="bg-[#1B1B1B] border-[#3F3F46] h-10"
              />
            </div>
            {sheets.length > 0 && (
              <div>
                <Label className="text-xs">Duplicate from existing sheet (optional)</Label>
                <Select value={sheetForm.duplicate_from || "none"} onValueChange={(v) => setSheetForm({ ...sheetForm, duplicate_from: v === "none" ? "" : v })}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10">
                    <SelectValue placeholder="Select sheet to copy entries from..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="none">None</SelectItem>
                    {sheets.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.entry_count} entries)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setCreateSheetDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46]">
              Cancel
            </Button>
            <Button onClick={handleCreateSheet} className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold">
              Create Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sheet Dialog */}
      <Dialog open={editSheetDialog} onOpenChange={setEditSheetDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">EDIT SHOOT LOG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Sheet Name *</Label>
                <Input
                  value={sheetForm.name}
                  onChange={(e) => setSheetForm({ ...sheetForm, name: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Project Name *</Label>
                <Input
                  value={sheetForm.project_name}
                  onChange={(e) => setSheetForm({ ...sheetForm, project_name: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Project Date *</Label>
                <Input
                  type="date"
                  value={sheetForm.project_date}
                  onChange={(e) => setSheetForm({ ...sheetForm, project_date: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Director</Label>
                <Input
                  value={sheetForm.director}
                  onChange={(e) => setSheetForm({ ...sheetForm, director: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Total Shoot Days</Label>
                <Input
                  type="number"
                  value={sheetForm.total_shoot_days}
                  onChange={(e) => setSheetForm({ ...sheetForm, total_shoot_days: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Current Day</Label>
                <Input
                  type="number"
                  value={sheetForm.current_shoot_day}
                  onChange={(e) => setSheetForm({ ...sheetForm, current_shoot_day: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
              <div>
                <Label className="text-xs">Log Artist *</Label>
                <Input
                  value={sheetForm.log_artist}
                  onChange={(e) => setSheetForm({ ...sheetForm, log_artist: e.target.value })}
                  className="bg-[#1B1B1B] border-[#3F3F46] h-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Production Company</Label>
              <Input
                value={sheetForm.production_company}
                onChange={(e) => setSheetForm({ ...sheetForm, production_company: e.target.value })}
                className="bg-[#1B1B1B] border-[#3F3F46] h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setEditSheetDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46]">
              Cancel
            </Button>
            <Button onClick={handleUpdateSheet} className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={filterDialog} onOpenChange={setFilterDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold flex items-center gap-2">
              <Filter size={20} />
              FILTER ENTRIES
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Scene No</Label>
                <Input
                  value={filters.scene_no}
                  onChange={(e) => setFilters({ ...filters, scene_no: e.target.value })}
                  placeholder="Search..."
                  className="bg-[#1B1B1B] border-[#3F3F46] h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Shot No</Label>
                <Input
                  value={filters.shot_no}
                  onChange={(e) => setFilters({ ...filters, shot_no: e.target.value })}
                  placeholder="Search..."
                  className="bg-[#1B1B1B] border-[#3F3F46] h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Go/NG</Label>
                <Select value={filters.go_ng || "all"} onValueChange={(v) => setFilters({ ...filters, go_ng: v === "all" ? "" : v })}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Go">Go</SelectItem>
                    <SelectItem value="NG">NG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">INT/EXT</Label>
                <Select value={filters.int_ext || "all"} onValueChange={(v) => setFilters({ ...filters, int_ext: v === "all" ? "" : v })}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="INT">INT</SelectItem>
                    <SelectItem value="EXT">EXT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Ready for Render</Label>
                <Select value={filters.ready_for_render || "all"} onValueChange={(v) => setFilters({ ...filters, ready_for_render: v === "all" ? "" : v })}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ready for Comp</Label>
                <Select value={filters.ready_for_comp || "all"} onValueChange={(v) => setFilters({ ...filters, ready_for_comp: v === "all" ? "" : v })}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">UE Environment</Label>
              <Input
                value={filters.ue_environment_name}
                onChange={(e) => setFilters({ ...filters, ue_environment_name: e.target.value })}
                placeholder="Search..."
                className="bg-[#1B1B1B] border-[#3F3F46] h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Comp Artist</Label>
              <Input
                value={filters.comp_artist}
                onChange={(e) => setFilters({ ...filters, comp_artist: e.target.value })}
                placeholder="Search..."
                className="bg-[#1B1B1B] border-[#3F3F46] h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={clearFilters} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46]">
              Clear All
            </Button>
            <Button onClick={applyFilters} className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold">
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
