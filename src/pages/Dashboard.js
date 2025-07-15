import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  User,
  Calendar,
  Timer
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import FileRequestCard from '../components/FileRequestCard';
import StatCard from '../components/StatCard';

const Dashboard = () => {
  const { currentUser, isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    overdue: 0,
    returned: 0,
    pending: 0
  });

  useEffect(() => {
    if (!currentUser) return;

    // Query based on user role
    const requestsQuery = isAdmin 
      ? query(collection(db, 'fileRequests'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'fileRequests'), 
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRequests(requestsData);
      
      // Calculate stats
      const newStats = requestsData.reduce((acc, request) => {
        acc[request.status] = (acc[request.status] || 0) + 1;
        return acc;
      }, { active: 0, overdue: 0, returned: 0, pending: 0 });
      
      setStats(newStats);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser, isAdmin]);

  const activeRequests = requests.filter(r => r.status === 'active');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const overdueRequests = requests.filter(r => r.status === 'overdue');

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? 'Monitor all file requests and system activity'
              : 'Track your file requests and deadlines'
            }
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Welcome back,</p>
          <p className="text-lg font-semibold text-gray-900">
            {currentUser?.displayName}
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Active Requests"
          value={stats.active}
          icon={Clock}
          color="warning"
          trend={"+2 from yesterday"}
        />
        <StatCard
          title="Overdue Files"
          value={stats.overdue}
          icon={AlertTriangle}
          color="danger"
          trend={stats.overdue > 0 ? "Requires attention" : "All good"}
        />
        <StatCard
          title="Completed"
          value={stats.returned}
          icon={CheckCircle}
          color="success"
          trend={"+5 this week"}
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={FileText}
          color="primary"
          trend={isAdmin ? "Awaiting your approval" : "Awaiting approval"}
        />
      </motion.div>

      {/* Quick Actions for Non-Admin Users */}
      {!isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Request New Files
            </button>
            <button className="btn-secondary flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              View History
            </button>
          </div>
        </motion.div>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Timer className="w-5 h-5 mr-2 text-warning-600" />
            Active Requests
          </h2>
          <div className="grid gap-4">
            <AnimatePresence>
              {activeRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <FileRequestCard request={request} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Overdue Requests */}
      {overdueRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-danger-600" />
            Overdue Files
          </h2>
          <div className="grid gap-4">
            <AnimatePresence>
              {overdueRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <FileRequestCard request={request} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Pending Requests (Admin Only) */}
      {isAdmin && pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Pending Approvals
          </h2>
          <div className="grid gap-4">
            <AnimatePresence>
              {pendingRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <FileRequestCard request={request} showApprovalActions />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && requests.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-12"
        >
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No file requests yet
          </h3>
          <p className="text-gray-600 mb-6">
            {isAdmin 
              ? 'Users haven\'t submitted any file requests yet.'
              : 'Start by requesting access to study files.'
            }
          </p>
          {!isAdmin && (
            <button className="btn-primary">
              Request Your First File
            </button>
          )}
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
