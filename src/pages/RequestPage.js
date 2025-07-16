import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  FileText, 
  Send,
  AlertCircle,
  CheckCircle,
  Users,
  UserCheck
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { notifyRequestSubmitted, notifyAdminNewRequest, getAdminUserIds } from '../utils/notificationService';

const RequestPage = () => {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState(new Set());
  const [availableIds, setAvailableIds] = useState([]);
  const [loadingIds, setLoadingIds] = useState(true);
  
  // Admin-specific states
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Debug authentication state
  useEffect(() => {
    console.log('Auth state changed:', {
      currentUser: currentUser?.email,
      authLoading,
      uid: currentUser?.uid
    });
  }, [currentUser, authLoading]);

  // Load available users for admin selection
  useEffect(() => {
    if (!isAdmin) return;

    setLoadingUsers(true);
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('displayName', 'asc')
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableUsers(usersData);
      setLoadingUsers(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoadingUsers(false);
    });

    return unsubscribe;
  }, [isAdmin]);

  // Get available study IDs from database
  useEffect(() => {
    // Only run query if user is authenticated and auth is not loading
    if (!currentUser || authLoading) {
      console.log('Skipping studyIds query - auth not ready:', {
        currentUser: !!currentUser,
        authLoading
      });
      setLoadingIds(false);
      return;
    }

    console.log('Setting up study IDs listener for user:', currentUser.email);
    
    const studyIdsQuery = query(
      collection(db, 'studyIds'), 
      where('isActive', '==', true)
      // orderBy('participantId', 'asc') // Temporarily commented out until index builds
    );
    
    const unsubscribe = onSnapshot(studyIdsQuery, (snapshot) => {
      try {
        const idsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort alphabetically by participantId in JavaScript until index is ready
        idsData.sort((a, b) => a.participantId.localeCompare(b.participantId));
        console.log('Fetched study IDs:', idsData.length, idsData);
        setAvailableIds(idsData);
        setLoadingIds(false);
      } catch (error) {
        console.error('Error processing study IDs:', error);
        toast.error('Failed to load study IDs');
        setLoadingIds(false);
      }
    }, (error) => {
      console.error('Error fetching study IDs:', error);
      console.error('Error details:', error.code, error.message);
      toast.error('Failed to connect to database');
      setLoadingIds(false);
    });

    return unsubscribe;
  }, [currentUser, authLoading]);

  // Get currently active/pending requests to mark IDs as unavailable
  useEffect(() => {
    // Only run query if user is authenticated
    if (!currentUser) {
      return;
    }

    console.log('Setting up active requests listener for user:', currentUser.email);
    
    const activeRequestsQuery = query(collection(db, 'fileRequests'));
    const unsubscribe = onSnapshot(activeRequestsQuery, (snapshot) => {
      const activeIds = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'active' || data.status === 'pending') {
          data.participantIds?.forEach(id => activeIds.add(id));
        }
      });
      setUnavailableIds(activeIds);
    }, (error) => {
      console.error('Error fetching active requests:', error);
    });

    return unsubscribe;
  }, [currentUser]);

  const filteredIds = availableIds.filter(item =>
    item.participantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleIdToggle = (participantId) => {
    if (unavailableIds.has(participantId)) {
      toast.error(`${participantId} is currently unavailable`);
      return;
    }

    setSelectedIds(prev => 
      prev.includes(participantId) 
        ? prev.filter(selectedId => selectedId !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSubmitRequest = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one participant ID');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for your request');
      return;
    }

    // For admin requests, check if a user is selected
    if (isAdmin && !selectedUser && availableUsers.length > 0) {
      toast.error('Please select a user for this request');
      return;
    }

    setLoading(true);
    try {
      // Determine who the request is for
      const requestForUser = isAdmin && selectedUser ? selectedUser : currentUser;
      
      // Create the request
      const docRef = await addDoc(collection(db, 'fileRequests'), {
        userId: requestForUser.uid || requestForUser.id,
        userEmail: requestForUser.email,
        userName: requestForUser.displayName,
        participantIds: selectedIds,
        reason: reason.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Add admin info if this is an admin request for another user
        ...(isAdmin && selectedUser && {
          requestedByAdmin: true,
          adminId: currentUser.uid,
          adminEmail: currentUser.email,
          adminName: currentUser.displayName
        })
      });

      // Create notifications
      const requestData = {
        id: docRef.id,
        userId: requestForUser.uid || requestForUser.id,
        userEmail: requestForUser.email,
        userName: requestForUser.displayName,
        participantIds: selectedIds,
        reason: reason.trim(),
        ...(isAdmin && selectedUser && {
          requestedByAdmin: true,
          adminName: currentUser.displayName
        })
      };

      // Notify the user that their request was submitted (or admin if admin made it)
      await notifyRequestSubmitted(requestData);

      // Notify all admins about the new request (unless admin made it for themselves)
      if (!(isAdmin && !selectedUser)) {
        const adminUserIds = await getAdminUserIds();
        if (adminUserIds.length > 0) {
          await notifyAdminNewRequest(requestData, adminUserIds);
        }
      }

      const successMessage = isAdmin && selectedUser 
        ? `Request submitted successfully for ${requestForUser.displayName}!`
        : 'Request submitted successfully!';
      
      toast.success(successMessage);
      setSelectedIds([]);
      setReason('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Request File Access
        </h1>
        <p className="text-gray-600">
          {isAdmin 
            ? "As an admin, you can search and select participant IDs to request access for yourself or other users"
            : "Search and select participant IDs to request access to their study files"
          }
        </p>
      </motion.div>

      {/* Admin User Selection */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-6 card-shine"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Request for User
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedUser(null)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                !selectedUser
                  ? 'border-blue-500 bg-blue-100/50 text-blue-700'
                  : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <UserCheck className="w-5 h-5 mr-2" />
              Request for Myself
            </button>
            
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = availableUsers.find(u => u.id === e.target.value);
                setSelectedUser(user || null);
              }}
              className="p-4 rounded-lg border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              disabled={loadingUsers}
            >
              <option value="" className="bg-gray-800 text-white">
                {loadingUsers ? 'Loading users...' : 'Select a user...'}
              </option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id} className="bg-gray-800 text-white">
                  {user.displayName} ({user.email})
                </option>
              ))}
            </select>
          </div>
          
          {selectedUser && (
            <div className="mt-4 p-3 bg-white/20 rounded-lg border border-white/30">
              <p className="text-white text-sm">
                <strong>Making request for:</strong> {selectedUser.displayName} ({selectedUser.email})
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search participant IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Selected IDs */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card bg-primary-50 border-primary-200"
          >
            <h3 className="font-semibold text-primary-900 mb-3 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Selected IDs ({selectedIds.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedIds.map(id => (
                <motion.span
                  key={id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {id}
                  <button
                    onClick={() => handleIdToggle(id)}
                    className="ml-2 text-primary-600 hover:text-primary-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participant IDs Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Available Participant IDs
        </h3>
        
        {filteredIds.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {loadingIds ? (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            ) : searchTerm ? (
              'No matching participant IDs found'
            ) : (
              <div>
                <p>No study IDs available</p>
                <p className="text-sm mt-2">Contact an administrator to add study IDs</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredIds.map(item => {
              const isSelected = selectedIds.includes(item.participantId);
              const isUnavailable = unavailableIds.has(item.participantId);
              
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: isUnavailable ? 1 : 1.02 }}
                  whileTap={{ scale: isUnavailable ? 1 : 0.98 }}
                  onClick={() => handleIdToggle(item.participantId)}
                  disabled={isUnavailable}
                  className={`
                    p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200
                    ${isSelected
                      ? 'border-primary-500 bg-primary-100 text-primary-700'
                      : isUnavailable
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.participantId}</span>
                    {isSelected && <CheckCircle className="w-4 h-4" />}
                    {isUnavailable && <AlertCircle className="w-4 h-4" />}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {item.description}
                    </div>
                  )}
                  {isUnavailable && (
                    <div className="text-xs text-gray-400 mt-1">In use</div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Reason for Request */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
          Reason for Request *
        </label>
        <textarea
          id="reason"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please provide a brief explanation for why you need access to these files..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center"
      >
        <button
          onClick={handleSubmitRequest}
          disabled={loading || selectedIds.length === 0 || !reason.trim()}
          className={`
            flex items-center px-8 py-3 rounded-lg font-semibold transition-all duration-200
            ${loading || selectedIds.length === 0 || !reason.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-105'
            }
          `}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Send className="w-5 h-5 mr-2" />
          )}
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card bg-blue-50 border-blue-200"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Your request will be reviewed by an administrator</li>
              <li>Once approved, you'll have 24 hours to work with the files</li>
              <li>Please return files promptly to avoid overdue status</li>
              <li>Grayed out IDs are currently in use by other users</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RequestPage;
