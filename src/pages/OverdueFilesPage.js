import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Calendar,
  Clock,
  FileText,
  Timer,
  User
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { isOverdue } from '../utils/dateUtils';
import FileRequestCard from '../components/FileRequestCard';

const OverdueFilesPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0, // >7 days overdue
    moderate: 0, // 3-7 days overdue
    recent: 0 // 1-2 days overdue
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

      // Filter only overdue requests
      const overdueRequests = requestsData.filter(req => 
        req.dueDate && isOverdue(req.dueDate.toDate())
      );

      setRequests(overdueRequests);

      // Calculate overdue severity stats
      const now = new Date();
      let critical = 0, moderate = 0, recent = 0;

      overdueRequests.forEach(req => {
        const dueDate = req.dueDate.toDate();
        const daysDiff = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 7) critical++;
        else if (daysDiff >= 3) moderate++;
        else recent++;
      });

      setStats({
        total: overdueRequests.length,
        critical,
        moderate,
        recent
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  const getDaysOverdue = (dueDate) => {
    const now = new Date();
    const due = dueDate.toDate();
    return Math.floor((now - due) / (1000 * 60 * 60 * 24));
  };

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
              <AlertTriangle className="w-8 h-8 mr-3 text-danger-600" />
              Overdue Files
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin ? 'All overdue file requests requiring attention' : 'Your overdue file requests'}
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
              <p className="text-sm font-medium text-gray-600">Total Overdue</p>
              <p className="text-2xl font-bold text-danger-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-danger-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical (&gt;7 days)</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <Timer className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Moderate (3-7 days)</p>
              <p className="text-2xl font-bold text-orange-600">{stats.moderate}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent (1-2 days)</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.recent}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Overdue Requests List */}
      {requests.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Overdue Requests ({requests.length})
          </h2>
          {requests
            .sort((a, b) => getDaysOverdue(b.dueDate) - getDaysOverdue(a.dueDate)) // Sort by most overdue first
            .map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <div className="absolute -left-2 top-4 w-1 h-16 bg-gradient-to-b from-danger-500 to-danger-300 rounded-full"></div>
                <div className="ml-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                      {getDaysOverdue(request.dueDate)} days overdue
                    </span>
                    {getDaysOverdue(request.dueDate) > 7 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <FileRequestCard 
                    request={request} 
                    isAdmin={isAdmin}
                    showActions={isAdmin}
                  />
                </div>
              </motion.div>
            ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Overdue Files</h3>
          <p className="text-gray-600 mb-6">
            {isAdmin 
              ? "Great! There are no overdue requests in the system." 
              : "Great! You don't have any overdue requests."
            }
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-success-50 rounded-lg">
            <span className="text-success-600 font-medium">All caught up! 🎉</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OverdueFilesPage;
