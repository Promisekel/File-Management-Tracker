import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useNotifications } from './hooks/useNotifications';
import Layout from './components/Layout';
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
  const { currentUser } = useAuth();
  
  // Enable notifications for authenticated users
  useNotifications();

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
