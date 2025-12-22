import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Globe from 'react-globe.gl';
import { 
  Users, FolderKanban, Clock, AlertTriangle, Activity, TrendingUp,
  MapPin, Zap, Eye, ChevronRight, Circle, Play, Pause, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Status colors for projects on the globe
const STATUS_COLORS = {
  'Planning': '#6366F1',      // Indigo
  'On Track': '#10B981',      // Green
  'At Risk': '#F59E0B',       // Amber
  'Delayed': '#EF4444',       // Red
  'Delivered': '#8B5CF6',     // Purple
  'Archived': '#6B7280'       // Gray
};

export default function CommandCenter() {
  const globeRef = useRef();
  const [commandData, setCommandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    fetchCommandData();
    const interval = setInterval(fetchCommandData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (globeRef.current && globeReady) {
      globeRef.current.controls().autoRotate = autoRotate;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
  }, [autoRotate, globeReady]);

  const fetchCommandData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/command-center`);
      setCommandData(response.data);
    } catch (error) {
      console.error('Failed to fetch command data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobeReady = () => {
    setGlobeReady(true);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);
    }
  };

  const focusOnProject = (project) => {
    setSelectedProject(project);
    setAutoRotate(false);
    if (globeRef.current && project.lat && project.lng) {
      globeRef.current.pointOfView({ lat: project.lat, lng: project.lng, altitude: 1.5 }, 1000);
    }
  };

  const getPointColor = (point) => STATUS_COLORS[point.status] || '#F9982E';

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#F9982E] mx-auto mb-4"></div>
          <div className="text-white font-mono text-sm tracking-widest">INITIALIZING COMMAND CENTER</div>
        </div>
      </div>
    );
  }

  const geoData = commandData?.projects?.geo_data || [];

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] overflow-hidden">
      {/* Globe Background */}
      <div className="absolute inset-0">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          
          // Points for projects
          pointsData={geoData}
          pointLat={d => d.lat}
          pointLng={d => d.lng}
          pointColor={d => getPointColor(d)}
          pointAltitude={0.01}
          pointRadius={0.5}
          pointsMerge={false}
          
          // Rings for active projects
          ringsData={geoData.filter(d => d.status === 'On Track' || d.status === 'At Risk')}
          ringLat={d => d.lat}
          ringLng={d => d.lng}
          ringColor={d => () => getPointColor(d)}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1500}
          
          // Arcs connecting HQ to projects (if we had HQ data)
          arcsData={geoData.length > 1 ? geoData.slice(1).map(d => ({
            startLat: geoData[0]?.lat,
            startLng: geoData[0]?.lng,
            endLat: d.lat,
            endLng: d.lng,
            color: getPointColor(d)
          })) : []}
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          arcStroke={0.3}
          
          // Labels
          labelsData={geoData}
          labelLat={d => d.lat}
          labelLng={d => d.lng}
          labelText={d => d.name}
          labelSize={1.2}
          labelDotRadius={0.4}
          labelColor={() => 'rgba(255, 255, 255, 0.9)'}
          labelResolution={2}
          
          // Atmosphere
          atmosphereColor="#3a228a"
          atmosphereAltitude={0.25}
          
          // Events
          onGlobeReady={handleGlobeReady}
          onPointClick={point => focusOnProject(point)}
          
          // Performance
          animateIn={true}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      </div>

      {/* Overlay Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(249, 152, 46, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 152, 46, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F9982E] rounded-full animate-pulse" />
              <span className="text-white font-mono text-xs tracking-widest">MACH COMMAND</span>
            </div>
            <div className="text-[#71717A] text-xs font-mono">
              {new Date().toLocaleString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }).toUpperCase()}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded-lg transition-colors ${autoRotate ? 'bg-[#F9982E]/20 text-[#F9982E]' : 'bg-white/5 text-white/50'}`}
            >
              {autoRotate ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button 
              onClick={fetchCommandData}
              className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Left Panel - Stats */}
      <div className="absolute top-20 left-6 w-72 z-10 space-y-4">
        {/* Active Projects */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#71717A] text-xs font-mono uppercase tracking-wider">ACTIVE PROJECTS</span>
            <FolderKanban size={14} className="text-[#F9982E]" />
          </div>
          <div className="text-4xl font-black text-white mb-2">
            {commandData?.projects?.total || 0}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(commandData?.projects?.by_status || {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || '#6B7280' }} />
                <span className="text-white/70">{status}: {count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Utilization */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#71717A] text-xs font-mono uppercase tracking-wider">TEAM UTILIZATION</span>
            <Users size={14} className="text-[#10B981]" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <div className="text-4xl font-black text-white">
              {commandData?.employees?.utilization_percent || 0}%
            </div>
            <div className="text-sm text-[#10B981] mb-1">
              {commandData?.employees?.active || 0} active
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-500"
              style={{ width: `${commandData?.employees?.utilization_percent || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/50 mt-2">
            <span>{commandData?.employees?.total || 0} total</span>
            <span>{commandData?.employees?.idle || 0} idle</span>
          </div>
        </div>

        {/* Task Progress */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#71717A] text-xs font-mono uppercase tracking-wider">TASK OVERVIEW</span>
            <Activity size={14} className="text-[#6366F1]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-2xl font-bold text-white">{commandData?.tasks?.total || 0}</div>
              <div className="text-xs text-white/50">Total Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#EF4444]">{commandData?.tasks?.bottlenecks || 0}</div>
              <div className="text-xs text-white/50">Bottlenecks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Alerts & Activity */}
      <div className="absolute top-20 right-6 w-80 z-10 space-y-4">
        {/* High Risk Deadlines */}
        {(commandData?.high_risk_details?.length || 0) > 0 && (
          <div className="bg-black/60 backdrop-blur-xl border border-[#EF4444]/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-[#EF4444]" />
              <span className="text-[#EF4444] text-xs font-mono uppercase tracking-wider">HIGH RISK DEADLINES</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {commandData?.high_risk_details?.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white text-sm truncate max-w-[180px]">{task.title}</div>
                    <div className="text-xs text-white/50">{task.assignee_name || 'Unassigned'}</div>
                  </div>
                  <div className="text-xs text-[#EF4444]">
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottlenecks */}
        {(commandData?.bottleneck_details?.length || 0) > 0 && (
          <div className="bg-black/60 backdrop-blur-xl border border-[#F59E0B]/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-[#F59E0B]" />
              <span className="text-[#F59E0B] text-xs font-mono uppercase tracking-wider">BOTTLENECKS</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {commandData?.bottleneck_details?.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <div className="text-white text-sm truncate max-w-[180px]">{task.title}</div>
                    <div className="text-xs text-white/50">{task.status}</div>
                  </div>
                  <ChevronRight size={14} className="text-white/30" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-[#8B5CF6]" />
            <span className="text-[#71717A] text-xs font-mono uppercase tracking-wider">LIVE ACTIVITY</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {commandData?.recent_activity?.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-2 p-2 hover:bg-white/5 rounded-lg transition-colors">
                <div className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs">
                    <span className="text-[#F9982E]">{activity.user_name}</span>
                    {' '}{activity.action}{' '}
                    <span className="text-white/70">{activity.entity_name || activity.entity_type}</span>
                  </div>
                  <div className="text-[10px] text-white/40">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {(!commandData?.recent_activity || commandData.recent_activity.length === 0) && (
              <div className="text-white/40 text-xs text-center py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel - Project List */}
      <div className="absolute bottom-6 left-6 right-6 z-10">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#F9982E]" />
              <span className="text-[#71717A] text-xs font-mono uppercase tracking-wider">PROJECT LOCATIONS</span>
            </div>
            <span className="text-xs text-white/50">{geoData.length} mapped</span>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {geoData.map((project) => (
              <button
                key={project.id}
                onClick={() => focusOnProject(project)}
                className={`flex-shrink-0 p-3 rounded-xl border transition-all ${
                  selectedProject?.id === project.id 
                    ? 'bg-[#F9982E]/20 border-[#F9982E]' 
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[project.status] || '#F9982E' }} 
                  />
                  <span className="text-white text-sm font-medium truncate max-w-[120px]">{project.name}</span>
                </div>
                <div className="text-xs text-white/50 text-left">
                  {project.city || 'Unknown'}, {project.country || ''}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#F9982E] transition-all"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/50">{project.progress || 0}%</span>
                </div>
              </button>
            ))}
            
            {geoData.length === 0 && (
              <div className="text-white/40 text-sm py-4 text-center w-full">
                No projects with locations. Add coordinates to projects to see them on the map.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Project Detail */}
      {selectedProject && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="bg-black/80 backdrop-blur-xl border border-[#F9982E]/50 rounded-2xl p-6 min-w-[300px]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-white font-bold text-lg">{selectedProject.name}</div>
                <div className="text-white/50 text-sm">{selectedProject.city}, {selectedProject.country}</div>
              </div>
              <button 
                onClick={() => { setSelectedProject(null); setAutoRotate(true); }}
                className="text-white/50 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ 
                  backgroundColor: `${STATUS_COLORS[selectedProject.status]}20`,
                  color: STATUS_COLORS[selectedProject.status]
                }}
              >
                {selectedProject.status}
              </div>
              <span className="text-white/50 text-xs">{selectedProject.progress}% complete</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#F9982E] to-[#F59E0B]"
                style={{ width: `${selectedProject.progress}%` }}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <Button 
                onClick={() => window.location.href = `/projects`}
                className="w-full bg-[#F9982E] hover:bg-[#F9982E]/90 text-black font-bold"
              >
                View Project Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
