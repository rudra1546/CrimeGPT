import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CreateCase from './pages/CreateCase';
import CaseDetails from './pages/CaseDetails';
import GenerateDocument from './pages/GenerateDocument';
import DocumentHistory from './pages/DocumentHistory';
import AdminDashboard from './pages/AdminDashboard';
import AIAssistant from './pages/AIAssistant';
import Navbar from './components/Navbar';

// private route wrapper to verify JWT token and layout Navbar
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-police-dark flex flex-col justify-center items-center gap-3 text-slate-500">
        <div className="w-10 h-10 border-4 border-police-border border-t-police-accent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold tracking-wider uppercase animate-pulse">Establishing Secure Connection...</span>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="flex min-h-screen bg-police-dark">
      <Navbar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-police-dark to-police-dark/95">
        {children}
      </main>
    </div>
  );
};

const AppContent = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Private Guarded routes */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
      <Route path="/cases" element={<PrivateRoute><Cases /></PrivateRoute>} />
      <Route path="/cases/create" element={<PrivateRoute><CreateCase /></PrivateRoute>} />
      <Route path="/cases/:id" element={<PrivateRoute><CaseDetails /></PrivateRoute>} />
      <Route path="/documents" element={<PrivateRoute><DocumentHistory /></PrivateRoute>} />
      <Route path="/documents/generate" element={<PrivateRoute><GenerateDocument /></PrivateRoute>} />
      <Route path="/assistant" element={<PrivateRoute><AIAssistant /></PrivateRoute>} />



      {/* Default Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
