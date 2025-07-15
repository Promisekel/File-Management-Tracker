import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  ArrowLeft, 
  Calendar,
  User,
  FileText,
  Timer
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { isOverdue } from '../utils/dateUtils';
import FileRequestCard from '../components/FileRequestCard';

const ActiveRequestsPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0
  });

  useEffect(() => {
    if (!currentUser) return;

    let q;
    if (isAdmin) {
      // Admin sees all active requests
      q = query(
        collection(db, 'fileRequests'),
        where('status', '==', 'active')
      );
    } else {
      // Regular users see only their active requests
      q = query(
        collection(db, 'fileRequests'),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'active')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRequests(requestsData);

      // Calculate detailed stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const overdueCount = requestsData.filter(req => 
        req.dueDate && isOverdue(req.dueDate.toDate())
      ).length;

      const dueTodayCount = requestsData.filter(req => {
        if (!req.dueDate) return false;
        const dueDate = req.dueDate.toDate();
        return dueDate >= today && dueDate < tomorrow;
      }).length;

      const dueTomorrowCount = requestsData.filter(req => {
        if (!req.dueDate) return false;
        const dueDate = req.dueDate.toDate();
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        return dueDate >= tomorrow && dueDate < dayAfterTomorrow;
      }).length;

      setStats({
        total: requestsData.length,
        overdue: overdueCount,
        dueToday: dueTodayCount,
        dueTomorrow: dueTomorrowCount
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Clock className="w-8 h-8 mr-3 text-warning-600" />
              Active Requests
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin ? 'All active file requests in the system' : 'Your active file requests'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Active</p>
              <p className="text-2xl font-bold text-warning-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-warning-50 rounded-lg">
              <FileText className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-danger-600">{stats.overdue}</p>
            </div>
            <div className="p-3 bg-danger-50 rounded-lg">
              <Timer className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Due Today</p>
              <p className="text-2xl font-bold text-primary-600">{stats.dueToday}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Due Tomorrow</p>
              <p className="text-2xl font-bold text-blue-600">{stats.dueTomorrow}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Requests List */}
      {requests.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Active Requests ({requests.length})
          </h2>
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <FileRequestCard 
                request={request} 
                isAdmin={isAdmin}
                showActions={isAdmin}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Requests</h3>
          <p className="text-gray-600 mb-6">
            {isAdmin 
              ? "There are no active requests in the system." 
              : "You don't have any active requests at the moment."
            }
          </p>
          {!isAdmin && (
            <button
              onClick={() => navigate('/request')}
              className="btn-primary"
            >
              Request New Files
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ActiveRequestsPage;
