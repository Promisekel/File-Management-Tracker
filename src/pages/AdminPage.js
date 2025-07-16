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
  UserPlus,
  Trash2,
  Shield,
  User
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { isOverdue } from '../utils/dateUtils';
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
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [addingUser, setAddingUser] = useState(false);
  const [preAddedUsers, setPreAddedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

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
      
      // Calculate stats with dynamic overdue detection
      const newStats = requestsData.reduce((acc, request) => {
        acc.total++;
        acc[request.status] = (acc[request.status] || 0) + 1;
        
        // Check if active requests are overdue
        if (request.status === 'active' && request.dueDate && isOverdue(request.dueDate)) {
          acc.overdue = (acc.overdue || 0) + 1;
          acc.active = acc.active - 1; // Remove from active count
        }
        
        return acc;
      }, { total: 0, pending: 0, active: 0, overdue: 0, returned: 0 });
      
      setStats(newStats);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load pre-added users
  useEffect(() => {
    const usersQuery = query(
      collection(db, 'preAddedUsers'),
      orderBy('addedAt', 'desc')
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPreAddedUsers(usersData);
      setLoadingUsers(false);
    });

    return unsubscribe;
  }, []);

  // Recalculate stats periodically for dynamic overdue detection
  useEffect(() => {
    const calculateStats = () => {
      const newStats = requests.reduce((acc, request) => {
        acc.total++;
        acc[request.status] = (acc[request.status] || 0) + 1;
        
        // Check if active requests are overdue
        if (request.status === 'active' && request.dueDate && isOverdue(request.dueDate)) {
          acc.overdue = (acc.overdue || 0) + 1;
          acc.active = acc.active - 1; // Remove from active count
        }
        
        return acc;
      }, { total: 0, pending: 0, active: 0, overdue: 0, returned: 0 });
      
      setStats(newStats);
    };

    if (requests.length > 0) {
      calculateStats();
      const interval = setInterval(calculateStats, 60000);
      return () => clearInterval(interval);
    }
  }, [requests]);

  const filteredRequests = requests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const handleAddAdmin = async () => {
    const email = newAdminEmail.trim();
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setAddingAdmin(true);
    try {
      // Add to adminEmails collection
      await setDoc(doc(db, 'adminEmails', email), {
        email: email,
        addedBy: currentUser.uid,
        addedAt: serverTimestamp()
      });

      // Also add to preAddedUsers collection with admin role
      await setDoc(doc(db, 'preAddedUsers', email), {
        email: email,
        role: 'admin',
        status: 'pre-added',
        addedBy: currentUser.uid,
        addedByName: currentUser.displayName || currentUser.email,
        addedAt: serverTimestamp()
      });
      
      toast.success('Admin added successfully!');
      setNewAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error(`Failed to add admin: ${error.message}`);
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleAddUser = async () => {
    const email = newUserEmail.trim();
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setAddingUser(true);
    try {
      // Add user to preAddedUsers collection
      await setDoc(doc(db, 'preAddedUsers', email), {
        email: email,
        role: newUserRole,
        status: 'pre-added',
        addedBy: currentUser.uid,
        addedByName: currentUser.displayName || currentUser.email,
        addedAt: serverTimestamp()
      });

      // If adding as admin, also add to adminEmails collection
      if (newUserRole === 'admin') {
        await setDoc(doc(db, 'adminEmails', email), {
          email: email,
          addedBy: currentUser.uid,
          addedAt: serverTimestamp()
        });
      }
      
      toast.success(`${newUserRole === 'admin' ? 'Admin' : 'User'} added successfully!`);
      setNewUserEmail('');
      setNewUserRole('user');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error(`Failed to add user: ${error.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userEmail) => {
    try {
      // Remove from preAddedUsers collection
      await deleteDoc(doc(db, 'preAddedUsers', userEmail));
      
      // If was admin, also try to remove from adminEmails (ignore errors if doesn't exist)
      try {
        await deleteDoc(doc(db, 'adminEmails', userEmail));
      } catch (adminError) {
        // Ignore error if admin email doesn't exist
        console.log('Admin email document not found, which is fine');
      }
      
      toast.success('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-400 via-purple-400 to-indigo-400 space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-white/70 mt-1">
            Manage file requests and system administration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center backdrop-blur-sm border border-white/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center shadow-lg"
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
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Filter Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 card-shine">
          <h3 className="font-semibold text-white mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filter Requests
          </h3>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'active', 'overdue', 'returned'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white/20 text-white/80 hover:bg-white/30 hover:shadow-md'
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

        {/* Add User */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 card-shine">
          <h3 className="font-semibold text-white mb-4 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Add User
          </h3>
          <div className="space-y-3">
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm"
            >
              <option value="user" className="bg-gray-800 text-white">Regular User</option>
              <option value="admin" className="bg-gray-800 text-white">Administrator</option>
            </select>
            <button
              onClick={handleAddUser}
              disabled={addingUser || !newUserEmail.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {addingUser ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add {newUserRole === 'admin' ? 'Admin' : 'User'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Add Admin */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 card-shine">
          <h3 className="font-semibold text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Quick Add Admin
          </h3>
          <div className="space-y-3">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="Enter admin email"
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
            />
            <button
              onClick={handleAddAdmin}
              disabled={addingAdmin || !newAdminEmail.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {addingAdmin ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Add Admin
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Pre-Added Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 card-shine"
      >
        <h3 className="font-semibold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Pre-Added Users ({preAddedUsers.length})
        </h3>
        
        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : preAddedUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-white/40 mx-auto mb-3" />
            <p className="text-white/60">No pre-added users yet</p>
            <p className="text-white/40 text-sm">Add users above to grant them access</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {preAddedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/20"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.role === 'admin' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                  }`}>
                    {user.role === 'admin' ? (
                      <Shield className="w-5 h-5 text-white" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.email}</p>
                    <p className="text-white/60 text-sm">
                      {user.role === 'admin' ? 'Administrator' : 'Regular User'} • 
                      Added by {user.addedByName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveUser(user.email)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
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
