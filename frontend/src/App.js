import { useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CommandCenter from './pages/CommandCenter';
import Inventory from './pages/Inventory';
import ItemsOut from './pages/ItemsOut';
import Projects from './pages/Projects';
import Licences from './pages/Licences';
import Issues from './pages/Issues';
import LostItems from './pages/LostItems';
import Maintenance from './pages/Maintenance';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1B1B1B] flex items-center justify-center">
        <div className="text-white font-data">LOADING...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Command Center - Full screen without layout */}
      <Route
        path="/command"
        element={
          <PrivateRoute>
            <CommandCenter />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="items-out" element={<ItemsOut />} />
        <Route path="projects" element={<Projects />} />
        <Route path="licences" element={<Licences />} />
        <Route path="issues" element={<Issues />} />
        <Route path="lost-items" element={<LostItems />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="shoot-logs" element={<ShootLogs />} />
        <Route path="employees" element={<Employees />} />
        <Route path="tasks" element={<Tasks />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;