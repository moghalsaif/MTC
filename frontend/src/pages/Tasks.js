import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ListTodo, Plus, Search, Filter, Clock, Play, Pause, CheckCircle,
  ChevronDown, ChevronRight, AlertTriangle, User, Calendar, Tag,
  MoreHorizontal, Pencil, Trash2, ArrowRight, Lock, Unlock
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_CONFIG = {
  'Not Started': { color: '#6B7280', bg: 'bg-gray-500/20' },
  'In Progress': { color: '#3B82F6', bg: 'bg-blue-500/20' },
  'Waiting for Input': { color: '#F59E0B', bg: 'bg-amber-500/20' },
  'Under Review': { color: '#8B5CF6', bg: 'bg-purple-500/20' },
  'Changes Requested': { color: '#EF4444', bg: 'bg-red-500/20' },
  'Approved': { color: '#10B981', bg: 'bg-emerald-500/20' },
  'Delivered': { color: '#06B6D4', bg: 'bg-cyan-500/20' }
};

const PRIORITY_CONFIG = {
  'Low': { color: '#6B7280', bg: 'bg-gray-500/20' },
  'Medium': { color: '#F59E0B', bg: 'bg-amber-500/20' },
  'High': { color: '#F97316', bg: 'bg-orange-500/20' },
  'Critical': { color: '#EF4444', bg: 'bg-red-500/20' }
};

const STATUSES = Object.keys(STATUS_CONFIG);
const PRIORITIES = Object.keys(PRIORITY_CONFIG);

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // list, board
  
  // Dialogs
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Time tracking
  const [activeTimeEntry, setActiveTimeEntry] = useState(null);
  
  // Form
  const [form, setForm] = useState({
    project_id: '', title: '', description: '', assignee_id: '',
    reviewer_id: '', priority: 'Medium', estimated_hours: '',
    deadline: '', buffer_days: '0', tags: '', parent_task_id: ''
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, [filterProject, filterStatus, filterPriority, filterAssignee]);

  const fetchData = async () => {
    try {
      const [tasksRes, projectsRes, employeesRes] = await Promise.all([
        axios.get(`${API}/tasks`, { params: buildParams() }),
        axios.get(`${API}/projects`),
        axios.get(`${API}/employees`)
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`, { params: buildParams() });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const buildParams = () => {
    const params = {};
    if (filterProject !== 'all') params.project_id = filterProject;
    if (filterStatus !== 'all') params.status = filterStatus;
    if (filterPriority !== 'all') params.priority = filterPriority;
    if (filterAssignee !== 'all') params.assignee_id = filterAssignee;
    return params;
  };

  const handleCreate = async () => {
    if (!form.project_id || !form.title) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      const data = {
        ...form,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        buffer_days: parseInt(form.buffer_days) || 0,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        parent_task_id: form.parent_task_id || null
      };
      await axios.post(`${API}/tasks`, data);
      toast.success('Task created');
      setCreateDialog(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdate = async () => {
    if (!selectedTask) return;
    try {
      const data = {
        ...form,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        buffer_days: parseInt(form.buffer_days) || 0,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : []
      };
      await axios.put(`${API}/tasks/${selectedTask.id}`, data);
      toast.success('Task updated');
      setEditDialog(false);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task and all sub-tasks?')) return;
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      toast.success('Status updated');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleStartTimer = async (task) => {
    if (!task.assignee_id) {
      toast.error('Task must be assigned to start timer');
      return;
    }
    try {
      const response = await axios.post(`${API}/time-entries/start`, {
        employee_id: task.assignee_id,
        task_id: task.id,
        project_id: task.project_id
      });
      setActiveTimeEntry(response.data);
      toast.success('Timer started');
      // Update task status to In Progress
      if (task.status === 'Not Started') {
        await handleStatusChange(task.id, 'In Progress');
      }
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimeEntry) return;
    try {
      await axios.post(`${API}/time-entries/stop/${activeTimeEntry.id}`);
      setActiveTimeEntry(null);
      toast.success('Timer stopped');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const openEdit = (task) => {
    setSelectedTask(task);
    setForm({
      project_id: task.project_id,
      title: task.title,
      description: task.description || '',
      assignee_id: task.assignee_id || '',
      reviewer_id: task.reviewer_id || '',
      priority: task.priority,
      estimated_hours: task.estimated_hours?.toString() || '',
      deadline: task.deadline?.split('T')[0] || '',
      buffer_days: task.buffer_days?.toString() || '0',
      tags: task.tags?.join(', ') || '',
      parent_task_id: task.parent_task_id || ''
    });
    setEditDialog(true);
  };

  const resetForm = () => {
    setForm({
      project_id: '', title: '', description: '', assignee_id: '',
      reviewer_id: '', priority: 'Medium', estimated_hours: '',
      deadline: '', buffer_days: '0', tags: '', parent_task_id: ''
    });
  };

  const filteredTasks = tasks.filter(task => {
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Group tasks by project for list view
  const tasksByProject = filteredTasks.reduce((acc, task) => {
    const projectId = task.project_id;
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(task);
    return acc;
  }, {});

  // Group tasks by status for board view
  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = filteredTasks.filter(t => t.status === status);
    return acc;
  }, {});

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white font-mono">LOADING TASKS...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-black text-white tracking-tight">TASKS</h1>
          <p className="text-[#71717A] text-sm">Workflow management and task tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTimeEntry && (
            <Button
              onClick={handleStopTimer}
              className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-bold rounded-xl animate-pulse"
            >
              <Pause size={16} className="mr-2" />
              Stop Timer
            </Button>
          )}
          <Button
            onClick={() => { resetForm(); setCreateDialog(true); }}
            className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold rounded-xl"
          >
            <Plus size={16} className="mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {STATUSES.slice(0, 5).map(status => (
          <div key={status} className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#71717A] text-xs uppercase truncate">{status}</span>
            </div>
            <div className="text-2xl font-black" style={{ color: STATUS_CONFIG[status].color }}>
              {tasks.filter(t => t.status === status).length}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-[#27272A] border border-[#3F3F46] rounded-xl p-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks..."
            className="pl-10 bg-[#1B1B1B] border-[#3F3F46] h-10"
          />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[160px] bg-[#1B1B1B] border-[#3F3F46] h-10">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent className="bg-[#27272A] border-[#3F3F46]">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] bg-[#1B1B1B] border-[#3F3F46] h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#27272A] border-[#3F3F46]">
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[120px] bg-[#1B1B1B] border-[#3F3F46] h-10">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[#27272A] border-[#3F3F46]">
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[140px] bg-[#1B1B1B] border-[#3F3F46] h-10">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent className="bg-[#27272A] border-[#3F3F46]">
            <SelectItem value="all">All Assignees</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 bg-[#1B1B1B] rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded text-xs ${viewMode === 'list' ? 'bg-[#F9982E] text-black' : 'text-[#71717A]'}`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1.5 rounded text-xs ${viewMode === 'board' ? 'bg-[#F9982E] text-black' : 'text-[#71717A]'}`}
          >
            Board
          </button>
        </div>
      </div>

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {Object.entries(tasksByProject).map(([projectId, projectTasks]) => (
            <div key={projectId} className="bg-[#27272A] border border-[#3F3F46] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#1B1B1B] border-b border-[#3F3F46] flex items-center justify-between">
                <span className="text-white font-medium">{getProjectName(projectId)}</span>
                <span className="text-[#71717A] text-sm">{projectTasks.length} tasks</span>
              </div>
              <div className="divide-y divide-[#3F3F46]/50">
                {projectTasks.map(task => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    employees={employees}
                    onEdit={() => openEdit(task)}
                    onDelete={() => handleDelete(task.id)}
                    onStatusChange={(status) => handleStatusChange(task.id, status)}
                    onStartTimer={() => handleStartTimer(task)}
                    isTimerActive={activeTimeEntry?.task_id === task.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => (
            <div key={status} className="flex-shrink-0 w-72">
              <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-[#3F3F46] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[status].color }} />
                    <span className="text-white text-sm font-medium">{status}</span>
                  </div>
                  <span className="text-[#71717A] text-xs">{tasksByStatus[status].length}</span>
                </div>
                <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                  {tasksByStatus[status].map(task => (
                    <div 
                      key={task.id}
                      className="bg-[#1B1B1B] rounded-lg p-3 cursor-pointer hover:bg-[#1B1B1B]/80"
                      onClick={() => openEdit(task)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-white text-sm font-medium">{task.title}</span>
                        <div 
                          className={`px-1.5 py-0.5 rounded text-[10px] ${PRIORITY_CONFIG[task.priority].bg}`}
                          style={{ color: PRIORITY_CONFIG[task.priority].color }}
                        >
                          {task.priority}
                        </div>
                      </div>
                      {task.assignee_name && (
                        <div className="flex items-center gap-1 text-xs text-[#71717A]">
                          <User size={10} />
                          {task.assignee_name}
                        </div>
                      )}
                      {task.deadline && (
                        <div className="flex items-center gap-1 text-xs text-[#71717A] mt-1">
                          <Calendar size={10} />
                          {new Date(task.deadline).toLocaleDateString()}
                        </div>
                      )}
                      {task.actual_hours > 0 && (
                        <div className="flex items-center gap-1 text-xs text-[#F9982E] mt-1">
                          <Clock size={10} />
                          {task.actual_hours.toFixed(1)}h logged
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-12 text-center">
          <ListTodo size={48} className="mx-auto text-[#71717A] mb-4" />
          <div className="text-white text-lg font-medium mb-2">No tasks found</div>
          <div className="text-[#A1A1AA] mb-4">Create tasks to start tracking work</div>
          <Button
            onClick={() => { resetForm(); setCreateDialog(true); }}
            className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold"
          >
            <Plus size={16} className="mr-2" />
            New Task
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">CREATE TASK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-xs">Project *</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({...form, project_id: v})}>
                <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10"><SelectValue placeholder="Select project..." /></SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46]" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Assignee</Label>
                <Select value={form.assignee_id || "none"} onValueChange={(v) => setForm({...form, assignee_id: v === "none" ? "" : v})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Reviewer</Label>
                <Select value={form.reviewer_id || "none"} onValueChange={(v) => setForm({...form, reviewer_id: v === "none" ? "" : v})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="none">No reviewer</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Estimated Hours</Label>
                <Input type="number" value={form.estimated_hours} onChange={(e) => setForm({...form, estimated_hours: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
              </div>
              <div>
                <Label className="text-xs">Buffer Days</Label>
                <Input type="number" value={form.buffer_days} onChange={(e) => setForm({...form, buffer_days: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} placeholder="e.g., urgent, vfx, review" className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
            </div>
            <div>
              <Label className="text-xs">Parent Task (for sub-tasks)</Label>
              <Select value={form.parent_task_id || "none"} onValueChange={(v) => setForm({...form, parent_task_id: v === "none" ? "" : v})}>
                <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10"><SelectValue placeholder="None (top-level task)" /></SelectTrigger>
                <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                  <SelectItem value="none">None (top-level task)</SelectItem>
                  {tasks.filter(t => !t.parent_task_id).map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreateDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46]">Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold">Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-[#27272A] border-[#3F3F46] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">EDIT TASK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46]" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Assignee</Label>
                <Select value={form.assignee_id || "none"} onValueChange={(v) => setForm({...form, assignee_id: v === "none" ? "" : v})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger className="bg-[#1B1B1B] border-[#3F3F46] h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
              </div>
              <div>
                <Label className="text-xs">Estimated Hours</Label>
                <Input type="number" value={form.estimated_hours} onChange={(e) => setForm({...form, estimated_hours: e.target.value})} className="bg-[#1B1B1B] border-[#3F3F46] h-10" />
              </div>
            </div>
            {selectedTask && (
              <div className="bg-[#1B1B1B] rounded-lg p-3">
                <div className="text-xs text-[#71717A] mb-2">Time Logged</div>
                <div className="text-2xl font-bold text-[#F9982E]">{selectedTask.actual_hours?.toFixed(1) || 0}h</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => handleDelete(selectedTask?.id)} className="bg-transparent border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 mr-auto">Delete</Button>
            <Button onClick={() => setEditDialog(false)} className="bg-transparent border border-[#3F3F46] text-white hover:bg-[#3F3F46]">Cancel</Button>
            <Button onClick={handleUpdate} className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Task Row Component
function TaskRow({ task, employees, onEdit, onDelete, onStatusChange, onStartTimer, isTimerActive }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const statusConfig = STATUS_CONFIG[task.status];
  
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-[#1B1B1B]/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium truncate">{task.title}</span>
          {task.is_locked && <Lock size={12} className="text-[#71717A]" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-[#71717A]">
          {task.assignee_name && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {task.assignee_name}
            </span>
          )}
          {task.deadline && (
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
          {task.tags?.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag size={10} />
              {task.tags.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>
      
      <div className={`px-2 py-1 rounded text-xs ${priorityConfig.bg}`} style={{ color: priorityConfig.color }}>
        {task.priority}
      </div>
      
      <Select value={task.status} onValueChange={onStatusChange}>
        <SelectTrigger className={`w-[140px] h-8 border-0 text-xs ${statusConfig.bg}`} style={{ color: statusConfig.color }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#27272A] border-[#3F3F46]">
          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-1 text-xs text-[#71717A] w-20">
        <Clock size={12} />
        {task.actual_hours?.toFixed(1) || 0}h
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={onStartTimer}
          className={`p-1.5 rounded-lg transition-colors ${isTimerActive ? 'bg-[#EF4444] text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
        >
          {isTimerActive ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={onEdit} className="p-1.5 bg-white/5 text-white hover:bg-white/10 rounded-lg">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 bg-white/5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
