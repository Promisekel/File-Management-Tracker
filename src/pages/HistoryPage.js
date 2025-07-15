import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History as HistoryIcon, 
  Calendar, 
  Search,
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  User
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, getStatusColor } from '../utils/dateUtils';
import DetailStatCard from '../components/DetailStatCard';

const HistoryPage = () => {
  const { currentUser, isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTimeRange, setFilterTimeRange] = useState('all');

  useEffect(() => {
    if (!currentUser) return;

    // Query based on user role
    const requestsQuery = isAdmin 
      ? query(collection(db, 'fileRequests'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'fileRequests'), 
          where('userId', '==', currentUser.uid)
          // Temporarily remove orderBy to check if it's an index issue
        );

    const unsubscribe = onSnapshot(
      requestsQuery, 
      (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('HistoryPage Debug:', {
          isAdmin,
          currentUserUid: currentUser?.uid,
          currentUserEmail: currentUser?.email,
          totalDocs: snapshot.size,
          requestsData: requestsData.map(r => ({ id: r.id, userId: r.userId, userName: r.userName, status: r.status }))
        });

        setRequests(requestsData);
        setLoading(false);
      },
      (error) => {
        console.error('HistoryPage Firestore Error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, isAdmin]);

  const filterByTimeRange = (request) => {
    if (filterTimeRange === 'all') return true;
    
    const requestDate = request.createdAt?.toDate();
    if (!requestDate) return false;
    
    const now = new Date();
    const daysDiff = (now - requestDate) / (1000 * 60 * 60 * 24);
    
    switch (filterTimeRange) {
      case 'today':
        return daysDiff <= 1;
      case 'week':
        return daysDiff <= 7;
      case 'month':
        return daysDiff <= 30;
      case 'quarter':
        return daysDiff <= 90;
      default:
        return true;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.participantIds?.some(id => 
        id.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      request.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesTimeRange = filterByTimeRange(request);
    
    return matchesSearch && matchesStatus && matchesTimeRange;
  });

  const exportHistory = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,User,Participant IDs,Status,Reason,Created,Approved,Due Date,Returned\n"
      + filteredRequests.map(r => 
          `${r.id},"${r.userName}","${r.participantIds?.join(', ')}",${r.status},"${r.reason}",${formatDate(r.createdAt)},${r.approvedAt ? formatDate(r.approvedAt) : ''},${r.dueDate ? formatDate(r.dueDate) : ''},${r.returnedAt ? formatDate(r.returnedAt) : ''}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `request_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'active':
        return FileText;
      case 'returned':
        return CheckCircle;
      case 'overdue':
        return AlertTriangle;
      default:
        return FileText;
    }
  };

  const calculateDuration = (request) => {
    if (request.status === 'pending') return 'N/A';
    
    const start = request.approvedAt?.toDate();
    const end = request.returnedAt?.toDate() || new Date();
    
    if (!start) return 'N/A';
    
    const diffHours = Math.floor((end - start) / (1000 * 60 * 60));
    const diffMinutes = Math.floor(((end - start) % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <HistoryIcon className="w-8 h-8 mr-3 text-primary-600" />
            Request History
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin 
              ? 'View all file request history and analytics'
              : 'Track your past file requests and activity'
            }
          </p>
        </div>
        <button
          onClick={exportHistory}
          className="btn-primary flex items-center"
        >
          <Download className="w-4 h-4 mr-2" />
          Export History
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-indigo-50/80 to-blue-100/60 border border-indigo-200/50 shadow-lg backdrop-blur-sm"
      >
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none"></div>
        
        <div className="relative space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by participant ID, user name, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-indigo-200/50 rounded-xl bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-indigo-400"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-indigo-200/50 rounded-xl bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-indigo-700"
              >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Time Range
              </label>
              <select
                value={filterTimeRange}
                onChange={(e) => setFilterTimeRange(e.target.value)}
                className="px-4 py-3 border border-indigo-200/50 rounded-xl bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-indigo-700"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="quarter">Past Quarter</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-indigo-600 font-medium">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>
        </div>
      </motion.div>

      {/* History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/50 shadow-lg backdrop-blur-sm"
      >
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
        <div className="relative">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 px-6">
              <HistoryIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
              No history found
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all' || filterTimeRange !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No file requests have been made yet.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-gradient-to-r from-gray-50 to-indigo-50/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Request
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/80 divide-y divide-gray-200/50">
                <AnimatePresence>
                  {filteredRequests.map((request, index) => {
                    const StatusIcon = getStatusIcon(request.status);
                    const colorScheme = getStatusColor(request.status);
                    
                    return (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.participantIds?.join(', ')}
                            </div>
                            <div className="text-sm text-gray-500">
                              Requested by: {request.userName || 'Unknown User'}
                            </div>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="w-4 h-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">
                                {request.userName}
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon className={`w-4 h-4 mr-2 text-${colorScheme}-600`} />
                            <span className={`status-badge status-${request.status}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {formatDate(request.createdAt)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateDuration(request)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={request.reason}>
                            {request.reason}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        </div>
      </motion.div>

      {/* Summary Stats */}
      {!loading && filteredRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {['pending', 'active', 'returned', 'overdue'].map((status, index) => {
            const count = filteredRequests.filter(r => r.status === status).length;
            const percentage = ((count / filteredRequests.length) * 100).toFixed(1);
            
            const statusConfig = {
              pending: { color: 'primary', icon: Clock },
              active: { color: 'warning', icon: FileText },
              returned: { color: 'success', icon: CheckCircle },
              overdue: { color: 'danger', icon: AlertTriangle }
            };
            
            const config = statusConfig[status];
            
            return (
              <DetailStatCard
                key={status}
                title={status.charAt(0).toUpperCase() + status.slice(1)}
                value={count}
                icon={config.icon}
                color={config.color}
                delay={index * 0.1}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default HistoryPage;
