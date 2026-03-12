import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FileText, Upload, Trash2, Download, FolderOpen, Search, Plus, File as FileIcon, Image, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type) {
  if (type?.startsWith('image/')) return Image;
  if (type?.includes('spreadsheet') || type?.includes('excel') || type?.includes('csv')) return FileSpreadsheet;
  if (type?.includes('pdf')) return FileText;
  return FileIcon;
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 30) return `${dy}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Documentation() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [newCatDialog, setNewCatDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'General', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => { fetchDocuments(); fetchCategories(); }, []);

  const fetchDocuments = async () => {
    try { setDocuments((await axios.get(`${API}/documents`)).data); }
    catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try { setCategories((await axios.get(`${API}/document-categories`)).data); }
    catch { setCategories([]); }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) { toast.error('Category name required'); return; }
    try {
      await axios.post(`${API}/document-categories?name=${encodeURIComponent(newCatName.trim())}`);
      toast.success(`Category "${newCatName.trim()}" created`);
      setNewCatName('');
      setNewCatDialog(false);
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to create category'); }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name) { toast.error('Please provide a file and name'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('name', uploadForm.name);
      fd.append('category', uploadForm.category);
      fd.append('description', uploadForm.description);
      await axios.post(`${API}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded');
      setUploadDialog(false);
      setSelectedFile(null);
      setUploadForm({ name: '', category: categories[0] || 'General', description: '' });
      fetchDocuments();
    } catch (e) { toast.error(e.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await axios.get(`${API}/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.setAttribute('download', doc.file_name);
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    try { await axios.delete(`${API}/documents/${doc.id}`); toast.success('Deleted'); fetchDocuments(); }
    catch { toast.error('Delete failed'); }
  };

  const filteredDocs = documents.filter(d => {
    const s = searchTerm.toLowerCase();
    return (!s || d.name.toLowerCase().includes(s) || d.file_name.toLowerCase().includes(s)) && (filterCategory === 'all' || d.category === filterCategory);
  });

  const catCounts = {};
  documents.forEach(d => { catCounts[d.category] = (catCounts[d.category] || 0) + 1; });

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-[#52525B] font-data text-sm">LOADING DOCUMENTS...</div></div>;

  return (
    <div className="space-y-6" data-testid="documentation-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight" data-testid="documentation-title">DOCUMENTATION</h1>
          <p className="text-[#52525B] mt-1 text-sm">{documents.length} documents</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewCatDialog(true)} data-testid="new-category-button" className="bg-transparent border border-[#232328] text-[#A1A1AA] hover:text-white hover:bg-[#1C1C1F] rounded-lg text-xs font-bold uppercase tracking-wider">
            <Plus size={14} className="mr-1" />Category
          </Button>
          <Button onClick={() => setUploadDialog(true)} data-testid="upload-doc-button" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg text-xs">
            <Upload size={16} className="mr-1.5" />Upload
          </Button>
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="category-pills">
          <button onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterCategory === 'all' ? 'bg-[#F9982E]/15 text-[#F9982E] border border-[#F9982E]/30' : 'bg-[#18181B] text-[#71717A] border border-[#232328] hover:text-white'}`}>
            All ({documents.length})
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterCategory === cat ? 'bg-[#F9982E]/15 text-[#F9982E] border border-[#F9982E]/30' : 'bg-[#18181B] text-[#71717A] border border-[#232328] hover:text-white'}`}>
              {cat} {catCounts[cat] ? `(${catCounts[cat]})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3F3F46]" size={16} />
        <Input placeholder="Search documents..." data-testid="doc-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-[#18181B] border-[#232328] focus:border-[#F9982E] text-white h-10 text-sm" />
      </div>

      {/* Documents */}
      {filteredDocs.length === 0 ? (
        <div className="bg-[#18181B] border border-[#232328] rounded-lg p-12 text-center">
          <FolderOpen size={40} className="text-[#232328] mx-auto mb-3" />
          <p className="text-[#3F3F46] text-sm">{documents.length === 0 ? 'No documents yet. Create a category and upload your first document.' : 'No documents match your filters.'}</p>
        </div>
      ) : (
        <div className="bg-[#18181B] border border-[#232328] rounded-lg overflow-hidden">
          <table className="w-full" data-testid="documents-table">
            <thead><tr className="border-b border-[#232328]">
              <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase tracking-wider">Name</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase">Category</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase">File</th>
              <th className="text-center py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase">Size</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase">Uploaded By</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase">Date</th>
              <th className="text-right py-2.5 px-4 text-[10px] font-bold text-[#52525B] uppercase">Actions</th>
            </tr></thead>
            <tbody>
              {filteredDocs.map(doc => {
                const Icon = getFileIcon(doc.file_type);
                return (
                  <tr key={doc.id} data-testid={`doc-row-${doc.id}`} className="border-b border-[#232328] last:border-b-0 hover:bg-[#1C1C1F] transition-colors">
                    <td className="py-3 px-4"><div className="flex items-center gap-2"><Icon size={16} className="text-[#F9982E] shrink-0" /><div><div className="text-white text-sm font-medium">{doc.name}</div>{doc.description && <div className="text-[10px] text-[#3F3F46] mt-0.5 truncate max-w-[200px]">{doc.description}</div>}</div></div></td>
                    <td className="py-3 px-4"><span className="text-[10px] font-data px-2 py-0.5 rounded bg-[#232328] text-[#71717A]">{doc.category}</span></td>
                    <td className="py-3 px-4 text-xs text-[#52525B] truncate max-w-[150px]">{doc.file_name}</td>
                    <td className="py-3 px-4 text-center text-xs text-[#52525B] font-data">{formatSize(doc.file_size)}</td>
                    <td className="py-3 px-4 text-xs text-[#52525B]">{doc.uploaded_by}</td>
                    <td className="py-3 px-4 text-xs text-[#3F3F46] font-data">{timeAgo(doc.created_at)}</td>
                    <td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleDownload(doc)} data-testid={`download-doc-${doc.id}`} className="p-1.5 rounded hover:bg-[#232328] text-[#71717A] hover:text-white transition-colors" title="Download"><Download size={14} /></button>
                      <button onClick={() => handleDelete(doc)} data-testid={`delete-doc-${doc.id}`} className="p-1.5 rounded hover:bg-[#EF4444]/20 text-[#71717A] hover:text-[#EF4444] transition-colors" title="Delete"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-md" data-testid="upload-doc-dialog">
          <DialogHeader><DialogTitle className="font-heading text-xl font-bold">UPLOAD DOCUMENT</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-white text-sm mb-2 block">Document Name *</Label>
              <Input data-testid="doc-name-input" value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. Insurance Policy 2026" />
            </div>
            <div><Label className="text-white text-sm mb-2 block">Category</Label>
              <Select value={uploadForm.category} onValueChange={(v) => setUploadForm({ ...uploadForm, category: v })}>
                <SelectTrigger data-testid="doc-category-select" className="bg-[#0F0F0F] border-[#232328] text-white h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#232328]">
                  {categories.length === 0 && <SelectItem value="General">General</SelectItem>}
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-white text-sm mb-2 block">Description</Label>
              <Input data-testid="doc-desc-input" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="Optional..." />
            </div>
            <div><Label className="text-white text-sm mb-2 block">File * (Max 25MB)</Label>
              <input type="file" data-testid="doc-file-input" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                onChange={(e) => { const f = e.target.files[0]; if (f) { setSelectedFile(f); if (!uploadForm.name) setUploadForm({ ...uploadForm, name: f.name.replace(/\.[^.]+$/, '') }); } }}
                className="w-full text-sm text-[#71717A] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#232328] file:text-white hover:file:bg-[#2C2C30] file:cursor-pointer file:uppercase file:tracking-wider" />
              {selectedFile && <p className="text-[10px] text-[#52525B] mt-1 font-data">{selectedFile.name} ({formatSize(selectedFile.size)})</p>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setUploadDialog(false); setSelectedFile(null); }} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadForm.name} data-testid="confirm-upload-doc" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={newCatDialog} onOpenChange={setNewCatDialog}>
        <DialogContent className="bg-[#18181B] border-[#232328] text-white max-w-sm" data-testid="new-category-dialog">
          <DialogHeader><DialogTitle className="font-heading text-xl font-bold">NEW CATEGORY</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label className="text-white text-sm mb-2 block">Category Name *</Label>
              <Input data-testid="new-cat-name-input" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="bg-[#0F0F0F] border-[#232328] focus:border-[#F9982E] text-white h-11" placeholder="e.g. Contracts, Insurance, SOPs" onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()} />
            </div>
            {categories.length > 0 && (
              <div><Label className="text-[#52525B] text-xs block">Existing: {categories.join(', ')}</Label></div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setNewCatDialog(false)} className="bg-transparent border border-[#232328] text-white hover:bg-[#232328] rounded-lg">Cancel</Button>
            <Button onClick={handleCreateCategory} data-testid="confirm-new-cat" className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-lg">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
