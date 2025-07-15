import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  ArrowLeft, 
  Calendar,
  TrendingUp,
  FileText,
  Award,
  User
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import FileRequestCard from '../components/FileRequestCard';

const CompletedRequestsPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    avgDays: 0
  });

  useEffect(() => {
    if (!currentUser) return;

    let q;
    if (isAdmin) {
      // Admin sees all completed requests
      q = query(
        collection(db, 'fileRequests'),
        where('status', '==', 'returned')
      );
    } else {
      // Regular users see only their completed requests
      q = query(
        collection(db, 'fileRequests'),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'returned')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRequests(requestsData);

      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const thisWeek = requestsData.filter(req => 
        req.returnedAt && req.returnedAt.toDate() >= weekAgo
      ).length;

      const thisMonth = requestsData.filter(req => 
        req.returnedAt && req.returnedAt.toDate() >= monthAgo
      ).length;

      // Calculate average completion time
      const completedWithDates = requestsData.filter(req => 
        req.createdAt && req.returnedAt
      );

      let avgDays = 0;
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, req) => {
          const created = req.createdAt.toDate();
          const returned = req.returnedAt.toDate();
          return sum + Math.floor((returned - created) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDays = Math.round(totalDays / completedWithDates.length);
      }

      setStats({
        total: requestsData.length,
        thisWeek,
        thisMonth,
        avgDays
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
              <CheckCircle className="w-8 h-8 mr-3 text-success-600" />
              Completed Requests
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin ? 'All completed file requests' : 'Your completed file requests'}
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
              <p className="text-sm font-medium text-gray-600">Total Completed</p>
              <p className="text-2xl font-bold text-success-600">{stats.total}</p>
            </div>
            <div className="p-3 bg-success-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-purple-600">{stats.thisMonth}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Completion</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.avgDays > 0 ? `${stats.avgDays} days` : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Award className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Completed Requests List */}
      {requests.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Completed Requests ({requests.length})
          </h2>
          {requests
            .sort((a, b) => {
              if (!a.returnedAt || !b.returnedAt) return 0;
              return b.returnedAt.toDate() - a.returnedAt.toDate();
            })
            .map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <div className="absolute -left-2 top-4 w-1 h-16 bg-gradient-to-b from-success-500 to-success-300 rounded-full"></div>
                <div className="ml-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                      ✓ Completed
                    </span>
                    {request.returnedAt && (
                      <span className="text-xs text-gray-500">
                        Returned on {request.returnedAt.toDate().toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <FileRequestCard 
                    request={request} 
                    isAdmin={isAdmin}
                    showActions={false}
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
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Requests</h3>
          <p className="text-gray-600 mb-6">
            {isAdmin 
              ? "No requests have been completed yet." 
              : "You haven't completed any requests yet."
            }
          </p>
          {!isAdmin && (
            <button
              onClick={() => navigate('/request')}
              className="btn-primary"
            >
              Make Your First Request
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CompletedRequestsPage;
