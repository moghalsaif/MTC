import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Users, ListTodo, Clock, AlertTriangle, Activity, TrendingUp,
  Plus, Search, Filter, Play, Pause, CheckCircle, ChevronDown, ChevronRight,
  User, Calendar, Tag, Pencil, Trash2, Eye, Circle, Coffee, Phone,
  MoreHorizontal, RefreshCw, Zap, Target, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Status configurations
const TASK_STATUS = {
  'Not Started': { color: '#6B7280', bg: 'bg-gray-500/20' },
  'In Progress': { color: '#3B82F6', bg: 'bg-blue-500/20' },
  'Waiting for Input': { color: '#F59E0B', bg: 'bg-amber-500/20' },
  'Under Review': { color: '#8B5CF6', bg: 'bg-purple-500/20' },
  'Changes Requested': { color: '#EF4444', bg: 'bg-red-500/20' },
  'Approved': { color: '#10B981', bg: 'bg-emerald-500/20' },
  'Delivered': { color: '#06B6D4', bg: 'bg-cyan-500/20' }
};

const EMPLOYEE_STATUS = {
  'Active': { color: '#10B981', icon: Play },
  'Idle': { color: '#6B7280', icon: Circle },
  'In Meeting': { color: '#8B5CF6', icon: Phone },
  'On Break': { color: '#F59E0B', icon: Coffee },
  'Offline': { color: '#EF4444', icon: Circle }
};

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_COLORS = { Low: '#6B7280', Medium: '#F59E0B', High: '#F97316', Critical: '#EF4444' };
const ROLES = ['Owner', 'Manager', 'Lead', 'Senior', 'Junior', 'Intern'];
const DEPARTMENTS = ['Production', 'Post-Production', 'VFX', 'Sound', 'Art', 'Camera', 'Lighting', 'Operations'];

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [taskDialog, setTaskDialog] = useState(false);
  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Forms
  const [taskForm, setTaskForm] = useState({
    project_id: '', title: '', description: '', assignee_id: '',
    priority: 'Medium', estimated_hours: '', deadline: ''
  });
  const [employeeForm, setEmployeeForm] = useState({
    name: '', email: '', role: 'Junior', department: '', location: ''
  });
  
  // Filters
  const [taskFilter, setTaskFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  
  // Active timer
  const [activeTimer, setActiveTimer] = useState(null);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      const [tasksRes, employeesRes, projectsRes, activityRes] = await Promise.all([
        axios.get(`${API}/tasks`),
        axios.get(`${API}/employees`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/activity-logs?limit=20`)
      ]);
      setTasks(tasksRes.data);
      setEmployees(employeesRes.data);
      setProjects(projectsRes.data);
      setActivityLogs(activityRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Task handlers
  const handleSaveTask = async () => {
    if (!taskForm.project_id || !taskForm.title) {
      toast.error('Project and title are required');
      return;
    }
    try {
      const data = {
        ...taskForm,
        estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null
      };
      if (editMode && selectedItem) {
        await axios.put(`${API}/tasks/${selectedItem.id}`, data);
        toast.success('Task updated');
      } else {
        await axios.post(`${API}/tasks`, data);
        toast.success('Task created');
      }
      setTaskDialog(false);
      resetTaskForm();
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleTaskStatusChange = async (taskId, status) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Employee handlers
  const handleSaveEmployee = async () => {
    if (!employeeForm.name || !employeeForm.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      if (editMode && selectedItem) {
        await axios.put(`${API}/employees/${selectedItem.id}`, employeeForm);
        toast.success('Team member updated');
      } else {
        await axios.post(`${API}/employees`, employeeForm);
        toast.success('Team member added');
      }
      setEmployeeDialog(false);
      resetEmployeeForm();
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save team member');
    }
  };

  const handleDeleteEmployee = async (empId) => {
    if (!window.confirm('Remove this team member?')) return;
    try {
      await axios.delete(`${API}/employees/${empId}`);
      toast.success('Team member removed');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to remove team member');
    }
  };

  const handleEmployeeStatusChange = async (empId, status) => {
    try {
      await axios.put(`${API}/employees/${empId}`, { status });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Time tracking
  const handleStartTimer = async (task) => {
    if (!task.assignee_id) {
      toast.error('Assign someone to start timer');
      return;
    }
    try {
      const res = await axios.post(`${API}/time-entries/start`, {
        employee_id: task.assignee_id,
        task_id: task.id,
        project_id: task.project_id
      });
      setActiveTimer(res.data);
      if (task.status === 'Not Started') {
        await handleTaskStatusChange(task.id, 'In Progress');
      }
      toast.success('Timer started');
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    try {
      await axios.post(`${API}/time-entries/stop/${activeTimer.id}`);
      setActiveTimer(null);
      toast.success('Timer stopped');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  // Form helpers
  const resetTaskForm = () => {
    setTaskForm({ project_id: '', title: '', description: '', assignee_id: '', priority: 'Medium', estimated_hours: '', deadline: '' });
    setEditMode(false);
    setSelectedItem(null);
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({ name: '', email: '', role: 'Junior', department: '', location: '' });
    setEditMode(false);
    setSelectedItem(null);
  };

  const openEditTask = (task) => {
    setSelectedItem(task);
    setEditMode(true);
    setTaskForm({
      project_id: task.project_id,
      title: task.title,
      description: task.description || '',
      assignee_id: task.assignee_id || '',
      priority: task.priority,
      estimated_hours: task.estimated_hours?.toString() || '',
      deadline: task.deadline?.split('T')[0] || ''
    });
    setTaskDialog(true);
  };

  const openEditEmployee = (emp) => {
    setSelectedItem(emp);
    setEditMode(true);
    setEmployeeForm({
      name: emp.name,
      email: emp.email,
      role: emp.role,
      department: emp.department || '',
      location: emp.location || ''
    });
    setEmployeeDialog(true);
  };

  // Stats
  const stats = {
    totalTasks: tasks.length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    blocked: tasks.filter(t => ['Waiting for Input', 'Changes Requested'].includes(t.status)).length,
    completed: tasks.filter(t => ['Approved', 'Delivered'].includes(t.status)).length,
    totalTeam: employees.length,
    activeTeam: employees.filter(e => e.status === 'Active').length,
    utilization: employees.length > 0 ? Math.round((employees.filter(e => e.status === 'Active').length / employees.length) * 100) : 0
  };

  const filteredTasks = tasks.filter(t => taskFilter === 'all' || t.status === taskFilter);
  const filteredEmployees = employees.filter(e => employeeFilter === 'all' || e.status === employeeFilter);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F9982E] mx-auto mb-4"></div>
          <div className="text-white font-mono text-sm tracking-widest">INITIALIZING COMMAND CENTER</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] overflow-hidden">
      {/* 3D Cube Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="cube-grid"></div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F9982E] rounded-full animate-pulse" />
              <span className="text-white font-mono text-sm tracking-widest">COMMAND CENTER</span>
            </div>
            <span className="text-white/40 text-xs font-mono">
              {new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {activeTimer && (
              <Button onClick={handleStopTimer} className="bg-[#EF4444] hover:bg-[#EF4444]/80 text-white text-xs h-8 animate-pulse">
                <Pause size={12} className="mr-1" /> Stop Timer
              </Button>
            )}
            <Button onClick={fetchAllData} variant="ghost" size="sm" className="text-white/50 hover:text-white">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-7 gap-3 px-6 py-4 border-b border-white/10">
          <StatCard label="TASKS" value={stats.totalTasks} color="#F9982E" />
          <StatCard label="IN PROGRESS" value={stats.inProgress} color="#3B82F6" />
          <StatCard label="BLOCKED" value={stats.blocked} color="#EF4444" />
          <StatCard label="COMPLETED" value={stats.completed} color="#10B981" />
          <StatCard label="TEAM" value={stats.totalTeam} color="#8B5CF6" />
          <StatCard label="ACTIVE" value={stats.activeTeam} color="#10B981" />
          <StatCard label="UTILIZATION" value={`${stats.utilization}%`} color="#F9982E" />
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 border-b border-white/10">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-0 gap-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#F9982E] data-[state=active]:text-black text-white/60 px-4 py-1.5 text-xs font-medium rounded-lg">
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-[#F9982E] data-[state=active]:text-black text-white/60 px-4 py-1.5 text-xs font-medium rounded-lg">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:bg-[#F9982E] data-[state=active]:text-black text-white/60 px-4 py-1.5 text-xs font-medium rounded-lg">
                Team
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-[#F9982E] data-[state=active]:text-black text-white/60 px-4 py-1.5 text-xs font-medium rounded-lg">
                Activity Log
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Tasks Column */}
              <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-white font-medium text-sm">TASKS</span>
                  <Button onClick={() => { resetTaskForm(); setTaskDialog(true); }} size="sm" className="bg-[#F9982E] hover:bg-[#F9982E]/80 text-black h-7 text-xs">
                    <Plus size={12} className="mr-1" /> Add
                  </Button>
                </div>
                <div className="p-3 space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                  {tasks.slice(0, 10).map(task => (
                    <TaskCard key={task.id} task={task} onEdit={() => openEditTask(task)} onStatusChange={handleTaskStatusChange} onStartTimer={() => handleStartTimer(task)} isTimerActive={activeTimer?.task_id === task.id} />
                  ))}
                  {tasks.length === 0 && <EmptyState text="No tasks yet" />}
                </div>
              </div>

              {/* Team Column */}
              <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-white font-medium text-sm">TEAM</span>
                  <Button onClick={() => { resetEmployeeForm(); setEmployeeDialog(true); }} size="sm" className="bg-[#F9982E] hover:bg-[#F9982E]/80 text-black h-7 text-xs">
                    <Plus size={12} className="mr-1" /> Add
                  </Button>
                </div>
                <div className="p-3 space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                  {employees.map(emp => (
                    <EmployeeCard key={emp.id} employee={emp} onEdit={() => openEditEmployee(emp)} onStatusChange={handleEmployeeStatusChange} />
                  ))}
                  {employees.length === 0 && <EmptyState text="No team members yet" />}
                </div>
              </div>

              {/* Activity Column */}
              <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <span className="text-white font-medium text-sm">LIVE ACTIVITY</span>
                </div>
                <div className="p-3 space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                  {activityLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5">
                      <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs">
                          <span className="text-[#F9982E]">{log.user_name}</span> {log.action} <span className="text-white/60">{log.entity_name}</span>
                        </div>
                        <div className="text-white/30 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                  {activityLogs.length === 0 && <EmptyState text="No activity yet" />}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={taskFilter} onValueChange={setTaskFilter}>
                    <SelectTrigger className="w-[160px] bg-black/40 border-white/10 h-9 text-xs text-white">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10">
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.keys(TASK_STATUS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => { resetTaskForm(); setTaskDialog(true); }} className="bg-[#F9982E] hover:bg-[#F9982E]/80 text-black h-9 text-xs">
                  <Plus size={14} className="mr-1" /> New Task
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTasks.map(task => (
                  <TaskCard key={task.id} task={task} onEdit={() => openEditTask(task)} onDelete={() => handleDeleteTask(task.id)} onStatusChange={handleTaskStatusChange} onStartTimer={() => handleStartTimer(task)} isTimerActive={activeTimer?.task_id === task.id} expanded />
                ))}
              </div>
              {filteredTasks.length === 0 && <EmptyState text="No tasks found" large />}
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="w-[140px] bg-black/40 border-white/10 h-9 text-xs text-white">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10">
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.keys(EMPLOYEE_STATUS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => { resetEmployeeForm(); setEmployeeDialog(true); }} className="bg-[#F9982E] hover:bg-[#F9982E]/80 text-black h-9 text-xs">
                  <Plus size={14} className="mr-1" /> Add Team Member
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredEmployees.map(emp => (
                  <EmployeeCard key={emp.id} employee={emp} onEdit={() => openEditEmployee(emp)} onDelete={() => handleDeleteEmployee(emp.id)} onStatusChange={handleEmployeeStatusChange} expanded />
                ))}
              </div>
              {filteredEmployees.length === 0 && <EmptyState text="No team members found" large />}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <span className="text-white font-medium text-sm">ALL ACTIVITY</span>
              </div>
              <div className="divide-y divide-white/5">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5">
                    <div className="w-2 h-2 bg-[#3B82F6] rounded-full" />
                    <div className="flex-1">
                      <span className="text-[#F9982E]">{log.user_name}</span>
                      <span className="text-white mx-1">{log.action}</span>
                      <span className="text-white/60">{log.entity_name || log.entity_type}</span>
                    </div>
                    <div className="text-white/30 text-xs">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                ))}
                {activityLogs.length === 0 && <EmptyState text="No activity recorded" />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">{editMode ? 'EDIT TASK' : 'NEW TASK'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs text-white/60">Project *</Label>
              <Select value={taskForm.project_id} onValueChange={(v) => setTaskForm({...taskForm, project_id: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-white/60">Title *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} className="bg-black/40 border-white/10 h-10" />
            </div>
            <div>
              <Label className="text-xs text-white/60">Description</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm({...taskForm, description: e.target.value})} className="bg-black/40 border-white/10" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/60">Assignee</Label>
                <Select value={taskForm.assignee_id || "none"} onValueChange={(v) => setTaskForm({...taskForm, assignee_id: v === "none" ? "" : v})}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-white/60">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({...taskForm, priority: v})}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/60">Est. Hours</Label>
                <Input type="number" value={taskForm.estimated_hours} onChange={(e) => setTaskForm({...taskForm, estimated_hours: e.target.value})} className="bg-black/40 border-white/10 h-10" />
              </div>
              <div>
                <Label className="text-xs text-white/60">Deadline</Label>
                <Input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm({...taskForm, deadline: e.target.value})} className="bg-black/40 border-white/10 h-10" />
              </div>
            </div>
          </div>
          <DialogFooter>
            {editMode && <Button onClick={() => handleDeleteTask(selectedItem?.id)} className="bg-transparent border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 mr-auto">Delete</Button>}
            <Button onClick={() => setTaskDialog(false)} variant="ghost" className="text-white/60">Cancel</Button>
            <Button onClick={handleSaveTask} className="bg-[#F9982E] hover:bg-[#F9982E]/80 text-black">{editMode ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={employeeDialog} onOpenChange={setEmployeeDialog}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold">{editMode ? 'EDIT TEAM MEMBER' : 'ADD TEAM MEMBER'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/60">Name *</Label>
                <Input value={employeeForm.name} onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})} className="bg-black/40 border-white/10 h-10" />
              </div>
              <div>
                <Label className="text-xs text-white/60">Email *</Label>
                <Input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})} className="bg-black/40 border-white/10 h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-white/60">Role</Label>
                <Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm({...employeeForm, role: v})}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-white/60">Department</Label>
                <Select value={employeeForm.department || "none"} onValueChange={(v) => setEmployeeForm({...employeeForm, department: v === "none" ? "" : v})}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    <SelectItem value="none">Select</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-white/60">Location</Label>
              <Input value={employeeForm.location} onChange={(e) => setEmployeeForm({...employeeForm, location: e.target.value})} placeholder="City, Country" className="bg-black/40 border-white/10 h-10" />
            </div>
          </div>
          <DialogFooter>
            {editMode && <Button onClick={() => handleDeleteEmployee(selectedItem?.id)} className="bg-transparent border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 mr-auto">Remove</Button>}
            <Button onClick={() => setEmployeeDialog(false)} variant="ghost" className="text-white/60">Cancel</Button>
            <Button onClick={handleSaveEmployee} className="bg-[#F9982E] hover:bg-[#F9982E]/80 text-black">{editMode ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .cube-grid {
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background-image: 
            linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px),
            linear-gradient(rgba(249, 152, 46, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 152, 46, 0.02) 1px, transparent 1px);
          background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
          transform: perspective(500px) rotateX(60deg);
          animation: gridMove 20s linear infinite;
        }
        @keyframes gridMove {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(100px); }
        }
      `}</style>
    </div>
  );
}

// Sub-components
function StatCard({ label, value, color }) {
  return (
    <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl p-3 text-center">
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-[10px] text-white/40 font-mono tracking-wider">{label}</div>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, onStartTimer, isTimerActive, expanded }) {
  const statusConfig = TASK_STATUS[task.status] || TASK_STATUS['Not Started'];
  const priorityColor = PRIORITY_COLORS[task.priority] || '#6B7280';
  
  return (
    <div className={`bg-black/30 border border-white/10 rounded-lg p-3 hover:border-[#F9982E]/50 transition-all ${expanded ? '' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">{task.title}</div>
          {task.assignee_name && <div className="text-white/40 text-xs flex items-center gap-1 mt-0.5"><User size={10} />{task.assignee_name}</div>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onStartTimer} className={`p-1 rounded ${isTimerActive ? 'bg-[#EF4444] text-white' : 'bg-white/10 text-white/60 hover:text-white'}`}>
            {isTimerActive ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button onClick={onEdit} className="p-1 rounded bg-white/10 text-white/60 hover:text-white"><Pencil size={12} /></button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>{task.status}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${priorityColor}20`, color: priorityColor }}>{task.priority}</span>
        {task.actual_hours > 0 && <span className="text-[10px] text-[#F9982E] flex items-center gap-0.5"><Clock size={10} />{task.actual_hours.toFixed(1)}h</span>}
      </div>
    </div>
  );
}

function EmployeeCard({ employee, onEdit, onDelete, onStatusChange, expanded }) {
  const statusConfig = EMPLOYEE_STATUS[employee.status] || EMPLOYEE_STATUS['Idle'];
  const StatusIcon = statusConfig.icon;
  
  return (
    <div className="bg-black/30 border border-white/10 rounded-lg p-3 hover:border-[#F9982E]/50 transition-all">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9982E] to-[#3B82F6] flex items-center justify-center text-black font-bold text-sm">
          {employee.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">{employee.name}</div>
          <div className="text-white/40 text-xs">{employee.role}</div>
        </div>
        <button onClick={onEdit} className="p-1 rounded bg-white/10 text-white/60 hover:text-white"><Pencil size={12} /></button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs" style={{ color: statusConfig.color }}>
          <StatusIcon size={10} />
          {employee.status}
        </div>
        <div className="text-white/40 text-xs">{employee.hours_today?.toFixed(1) || 0}h today</div>
      </div>
    </div>
  );
}

function EmptyState({ text, large }) {
  return (
    <div className={`text-center text-white/30 ${large ? 'py-12' : 'py-6'}`}>
      <Target size={large ? 32 : 20} className="mx-auto mb-2 opacity-50" />
      <div className="text-xs">{text}</div>
    </div>
  );
}
