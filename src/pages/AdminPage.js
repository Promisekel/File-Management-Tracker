import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Filter,
  Download,
  RefreshCw,
  Settings,
  UserPlus
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import FileRequestCard from '../components/FileRequestCard';
import StatCard from '../components/StatCard';
import toast from 'react-hot-toast';
import { notifyRequestApproved, notifyRequestRejected, notifyFileReturned } from '../utils/notificationService';

const AdminPage = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    overdue: 0,
    returned: 0
  });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    const requestsQuery = query(
      collection(db, 'fileRequests'),
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
        acc.total++;
        acc[request.status] = (acc[request.status] || 0) + 1;
        return acc;
      }, { total: 0, pending: 0, active: 0, overdue: 0, returned: 0 });
      
      setStats(newStats);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredRequests = requests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const handleBulkAction = async (action, selectedRequests) => {
    try {
      const promises = selectedRequests.map(async (request) => {
        const updates = {
          status: action,
          updatedAt: serverTimestamp()
        };

        if (action === 'active') {
          const dueDate = new Date();
          dueDate.setHours(dueDate.getHours() + 24);
          updates.dueDate = dueDate;
          updates.approvedAt = serverTimestamp();
          updates.approvedBy = currentUser.email;
        } else if (action === 'rejected') {
          updates.rejectedAt = serverTimestamp();
          updates.rejectedBy = currentUser.email;
        } else if (action === 'returned') {
          updates.returnedAt = serverTimestamp();
        }

        // Update the document
        await updateDoc(doc(db, 'fileRequests', request.id), updates);

        // Send notifications
        try {
          if (action === 'active') {
            await notifyRequestApproved(request, updates.dueDate);
          } else if (action === 'rejected') {
            await notifyRequestRejected(request, 'Please contact an administrator for more details.');
          } else if (action === 'returned') {
            await notifyFileReturned(request);
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
          // Don't fail the whole operation if notification fails
        }
      });

      await Promise.all(promises);
      toast.success(`Successfully ${action === 'active' ? 'approved' : action} ${selectedRequests.length} request(s)`);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setAddingAdmin(true);
    try {
      // In a real app, you'd want to validate the user exists first
      // For now, we'll just add the email to the admins collection
      await setDoc(doc(db, 'adminEmails', newAdminEmail.trim()), {
        email: newAdminEmail.trim(),
        addedBy: currentUser.uid,
        addedAt: serverTimestamp()
      });
      
      toast.success('Admin email added successfully');
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,User,Participant IDs,Status,Created,Due Date,Returned\n"
      + requests.map(r => 
          `${r.id},${r.userName},"${r.participantIds?.join(', ')}",${r.status},${r.createdAt?.toDate()},${r.dueDate?.toDate() || ''},${r.returnedAt?.toDate() || ''}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `file_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage file requests and system administration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="btn-primary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
      >
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={FileText}
          color="primary"
          trend="All time"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={Clock}
          color="warning"
          trend="Needs attention"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={Users}
          color="primary"
          trend="Currently checked out"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          color="danger"
          trend="Immediate action required"
        />
        <StatCard
          title="Completed"
          value={stats.returned}
          icon={CheckCircle}
          color="success"
          trend="Successfully returned"
        />
      </motion.div>

      {/* Admin Tools */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Filter Controls */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filter Requests
          </h3>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'active', 'overdue', 'returned'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className="ml-1 text-xs">({stats[status] || 0})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Add Admin */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Add Administrator
          </h3>
          <div className="flex space-x-2">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleAddAdmin}
              disabled={addingAdmin || !newAdminEmail.trim()}
              className="btn-primary flex items-center"
            >
              {addingAdmin ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Requests List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {filterStatus === 'all' ? 'All Requests' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Requests`}
            <span className="text-gray-500 ml-2">({filteredRequests.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {filterStatus !== 'all' ? filterStatus : ''} requests found
            </h3>
            <p className="text-gray-600">
              {filterStatus === 'all' 
                ? 'No file requests have been submitted yet.'
                : `There are no ${filterStatus} requests at the moment.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <FileRequestCard 
                    request={request} 
                    showApprovalActions={request.status === 'pending'}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminPage;
