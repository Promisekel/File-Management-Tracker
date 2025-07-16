import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useNotifications } from './hooks/useNotifications';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import Layout from './components/Layout';
import NotificationPermission from './components/NotificationPermission';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import RequestPage from './pages/RequestPage';
import AdminPage from './pages/AdminPage';
import HistoryPage from './pages/HistoryPage';
import ManageStudyIds from './pages/ManageStudyIds';
import TestPage from './pages/TestPage';
import ActiveRequestsPage from './pages/ActiveRequestsPage';
import OverdueFilesPage from './pages/OverdueFilesPage';
import CompletedRequestsPage from './pages/CompletedRequestsPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import './index.css';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, isAdmin } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { currentUser, loading } = useAuth();
  
  // Enable notifications for authenticated users
  useNotifications();

  // Show loading screen while authentication is being initialized
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 p-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading SMART Tracker</h2>
          <p className="text-white/70">Checking authentication status...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/dashboard" /> : <LoginPage />} 
      />
      <Route path="/" element={<Layout />}>
        <Route 
          index 
          element={<Navigate to="/dashboard" />} 
        />
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="request" 
          element={
            <ProtectedRoute>
              <RequestPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin" 
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="manage-ids" 
          element={
            <ProtectedRoute adminOnly>
              <ManageStudyIds />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="history" 
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="active-requests" 
          element={
            <ProtectedRoute>
              <ActiveRequestsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="overdue-files" 
          element={
            <ProtectedRoute>
              <OverdueFilesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="completed-requests" 
          element={
            <ProtectedRoute>
              <CompletedRequestsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="pending-approval" 
          element={
            <ProtectedRoute>
              <PendingApprovalPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="test" 
          element={
            <ProtectedRoute>
              <TestPage />
            </ProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <NotificationPermission />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
