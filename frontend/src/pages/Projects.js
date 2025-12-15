import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, FolderKanban, Trash2, FileText, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addProjectDialog, setAddProjectDialog] = useState(false);
  const [editProjectDialog, setEditProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    location: '',
    start_date: '',
    end_date: '',
    owner: '',
    status: 'Planning'
  });
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    location: '',
    start_date: '',
    end_date: '',
    owner: '',
    status: 'Planning'
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectForm.name) {
      toast.error('Please enter project name');
      return;
    }

    try {
      await axios.post(`${API}/projects`, newProjectForm);
      toast.success('Project created successfully');
      setAddProjectDialog(false);
      setNewProjectForm({
        name: '',
        location: '',
        start_date: '',
        end_date: '',
        owner: '',
        status: 'Planning'
      });
      fetchProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await axios.delete(`${API}/projects/${projectId}`);
      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete project');
    }
  };

  const openEditProject = (project) => {
    setEditingProject(project);
    setEditProjectForm({
      name: project.name || '',
      location: project.location || '',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      owner: project.owner || '',
      status: project.status || 'Planning'
    });
    setEditProjectDialog(true);
  };

  const handleUpdateProject = async () => {
    if (!editProjectForm.name) {
      toast.error('Please enter project name');
      return;
    }

    try {
      await axios.put(`${API}/projects/${editingProject.id}`, editProjectForm);
      toast.success('Project updated successfully');
      setEditProjectDialog(false);
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to update project');
    }
  };

  const handleGeneratePDF = async (project) => {
    try {
      toast.info('Generating packing list...');
      const response = await axios.get(`${API}/projects/${project.id}/packing-list-pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `packing_list_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Packing list downloaded');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate packing list');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Planning': 'bg-blue-950/30 text-blue-400 border-blue-900',
      'Active': 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
      'Wrapped': 'bg-[#3F3F46] text-white border-[#3F3F46]'
    };
    return badges[status] || 'bg-[#3F3F46] text-white border-[#3F3F46]';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-data">LOADING PROJECTS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black text-white tracking-tight" data-testid="projects-title">
            PROJECTS
          </h1>
          <p className="text-[#A1A1AA] mt-2">{projects.length} total projects</p>
        </div>
        <Button
          onClick={() => setAddProjectDialog(true)}
          data-testid="add-project-button"
          className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
        >
          <Plus size={18} className="mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-12 text-center" data-testid="no-projects">
          <FolderKanban size={48} className="mx-auto text-[#71717A] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No projects yet</div>
          <div className="text-[#A1A1AA]">Create your first project to start tracking equipment</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              data-testid={`project-card-${project.id}`}
              className="bg-[#27272A] border border-[#3F3F46] rounded-2xl p-6 hover:border-[#F9982E] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-white font-heading text-xl font-bold mb-2">{project.name}</h3>
                  <span className={`font-mono text-xs uppercase tracking-widest px-2 py-1 rounded-2xl border ${getStatusBadge(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGeneratePDF(project)}
                    data-testid={`generate-pdf-${project.id}`}
                    className="p-2 text-[#F9982E] hover:bg-[#F9982E]/10 rounded-2xl transition-colors"
                    title="Generate packing list PDF"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    data-testid={`delete-project-${project.id}`}
                    className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-2xl transition-colors"
                    title="Delete project"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {project.location && (
                  <div>
                    <span className="text-[#71717A]">Location:</span>
                    <span className="text-white ml-2">{project.location}</span>
                  </div>
                )}
                {project.start_date && (
                  <div>
                    <span className="text-[#71717A]">Start Date:</span>
                    <span className="text-white ml-2">{new Date(project.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {project.end_date && (
                  <div>
                    <span className="text-[#71717A]">End Date:</span>
                    <span className="text-white ml-2">{new Date(project.end_date).toLocaleDateString()}</span>
                  </div>
                )}
                {project.owner && (
                  <div>
                    <span className="text-[#71717A]">Owner:</span>
                    <span className="text-white ml-2">{project.owner}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addProjectDialog} onOpenChange={setAddProjectDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-md" data-testid="add-project-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">CREATE NEW PROJECT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white text-sm mb-2 block">Project Name *</Label>
              <Input
                data-testid="project-name-input"
                value={newProjectForm.name}
                onChange={(e) => setNewProjectForm({...newProjectForm, name: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Location</Label>
              <Input
                data-testid="project-location-input"
                value={newProjectForm.location}
                onChange={(e) => setNewProjectForm({...newProjectForm, location: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Start Date</Label>
              <Input
                type="date"
                data-testid="project-start-date-input"
                value={newProjectForm.start_date}
                onChange={(e) => setNewProjectForm({...newProjectForm, start_date: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">End Date</Label>
              <Input
                type="date"
                data-testid="project-end-date-input"
                value={newProjectForm.end_date}
                onChange={(e) => setNewProjectForm({...newProjectForm, end_date: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Project Owner</Label>
              <Input
                data-testid="project-owner-input"
                value={newProjectForm.owner}
                onChange={(e) => setNewProjectForm({...newProjectForm, owner: e.target.value})}
                className="bg-[#1B1B1B] border-[#3F3F46] focus:border-[#F9982E] text-white h-12"
              />
            </div>
            <div>
              <Label className="text-white text-sm mb-2 block">Status</Label>
              <Select value={newProjectForm.status} onValueChange={(val) => setNewProjectForm({...newProjectForm, status: val})}>
                <SelectTrigger data-testid="project-status-select" className="bg-[#1B1B1B] border-[#3F3F46] text-white h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Wrapped">Wrapped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setAddProjectDialog(false)}
              data-testid="cancel-project"
              className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46] rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProject}
              data-testid="confirm-project"
              className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold uppercase tracking-wider rounded-2xl"
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}