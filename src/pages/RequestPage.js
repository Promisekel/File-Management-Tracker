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
  
  // Manual user entry states (for users not in system)
  const [manualUserName, setManualUserName] = useState('');
  const [manualUserEmail, setManualUserEmail] = useState('');
  const [requestMode, setRequestMode] = useState('self'); // 'self', 'existing_user', 'manual_user'

  // Debug authentication state
  useEffect(() => {
    console.log('Auth state changed:', {
      currentUser: currentUser?.email,
      authLoading,
      uid: currentUser?.uid,
      isAdmin
    });
  }, [currentUser, authLoading, isAdmin]);

  // Load available users for admin selection (both regular users and pre-added users)
  useEffect(() => {
    if (!isAdmin) return;

    setLoadingUsers(true);
    
    // Set up listeners for both collections
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('displayName', 'asc')
    );
    
    const preAddedUsersQuery = query(
      collection(db, 'preAddedUsers'),
      orderBy('displayName', 'asc')
    );

    let regularUsers = [];
    let preAddedUsers = [];
    let unsubscribeCount = 0;
    
    const updateCombinedUsers = () => {
      // Combine both arrays and remove duplicates based on email
      const allUsers = [...regularUsers, ...preAddedUsers];
      const uniqueUsers = allUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.email === user.email)
      );
      
      // Sort by display name
      uniqueUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
      
      setAvailableUsers(uniqueUsers);
      if (unsubscribeCount === 2) {
        setLoadingUsers(false);
      }
    };

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      regularUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'users'
      }));
      unsubscribeCount++;
      updateCombinedUsers();
    }, (error) => {
      console.error('Error fetching users:', error);
      unsubscribeCount++;
      if (unsubscribeCount === 2) {
        setLoadingUsers(false);
      }
    });

    const unsubscribePreAddedUsers = onSnapshot(preAddedUsersQuery, (snapshot) => {
      preAddedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'preAddedUsers'
      }));
      unsubscribeCount++;
      updateCombinedUsers();
    }, (error) => {
      console.error('Error fetching pre-added users:', error);
      unsubscribeCount++;
      if (unsubscribeCount === 2) {
        setLoadingUsers(false);
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribePreAddedUsers();
    };
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

    // Validation for admin requests
    if (isAdmin && requestMode === 'manual_user') {
      if (!manualUserName.trim()) {
        toast.error('Please enter the user\'s name');
        return;
      }
      if (!manualUserEmail.trim()) {
        toast.error('Please enter the user\'s email');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(manualUserEmail)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);
    try {
      // Determine who the request is for based on mode
      let requestForUser;
      let isManualUser = false;
      
      if (isAdmin && requestMode === 'manual_user') {
        // Manual user entry
        requestForUser = {
          email: manualUserEmail.trim(),
          displayName: manualUserName.trim(),
          uid: manualUserEmail.trim(), // Use email as temporary ID for manual users
          isManualEntry: true
        };
        isManualUser = true;
      } else if (isAdmin && requestMode === 'existing_user' && selectedUser) {
        // Existing user selection
        requestForUser = selectedUser;
      } else {
        // Self request (admin or regular user)
        requestForUser = currentUser;
      }
      
      console.log('Creating request for:', {
        requestForUser: requestForUser?.email,
        requestMode,
        isManualUser,
        selectedIds,
        reason: reason.trim()
      });
      
      // Create the request
      const requestData = {
        userId: requestForUser.uid,
        userEmail: requestForUser.email,
        userName: requestForUser.displayName,
        participantIds: selectedIds,
        reason: reason.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Add admin info if this is an admin request for another user
        ...(isAdmin && (requestMode === 'existing_user' || requestMode === 'manual_user') && {
          requestedByAdmin: true,
          adminId: currentUser.uid,
          adminEmail: currentUser.email,
          adminName: currentUser.displayName,
          ...(isManualUser && { isManualUserEntry: true })
        })
      };

      const docRef = await addDoc(collection(db, 'fileRequests'), requestData);

      // Create notifications
      const notificationData = {
        id: docRef.id,
        ...requestData,
        ...(isAdmin && (requestMode === 'existing_user' || requestMode === 'manual_user') && {
          requestedByAdmin: true,
          adminName: currentUser.displayName
        })
      };

      // Notify the user that their request was submitted (or admin if admin made it)
      await notifyRequestSubmitted(notificationData);

      // Notify all admins about the new request (unless admin made it for themselves)
      if (!(isAdmin && requestMode === 'self')) {
        const adminUserIds = await getAdminUserIds();
        if (adminUserIds.length > 0) {
          await notifyAdminNewRequest(notificationData, adminUserIds);
        }
      }

      let successMessage = 'Request submitted successfully!';
      if (isAdmin && requestMode === 'existing_user') {
        successMessage = `Request submitted successfully for ${requestForUser.displayName}!`;
      } else if (isAdmin && requestMode === 'manual_user') {
        successMessage = `Request submitted successfully for ${manualUserName}!`;
      }
      
      toast.success(successMessage);
      
      // Reset form
      setSelectedIds([]);
      setReason('');
      setSelectedUser(null);
      setManualUserName('');
      setManualUserEmail('');
      setRequestMode('self');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Request File Access
        </h1>
        <p className="text-sm sm:text-base text-gray-600 px-2">
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
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mx-2 sm:mx-0"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-base sm:text-lg">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Request Mode
          </h3>
          
          {/* Request Mode Selection */}
          <div className="space-y-3 mb-4">
            <button
              onClick={() => {
                setRequestMode('self');
                setSelectedUser(null);
                setManualUserName('');
                setManualUserEmail('');
              }}
              className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-sm sm:text-base ${
                requestMode === 'self'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Request for Myself
            </button>
            
            <button
              onClick={() => {
                setRequestMode('existing_user');
                setManualUserName('');
                setManualUserEmail('');
              }}
              className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-sm sm:text-base ${
                requestMode === 'existing_user'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Request for Existing User
            </button>
            
            <button
              onClick={() => {
                setRequestMode('manual_user');
                setSelectedUser(null);
              }}
              className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-sm sm:text-base ${
                requestMode === 'manual_user'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Request for Anyone (Enter Details)
            </button>
          </div>

          {/* Existing User Selection */}
          {requestMode === 'existing_user' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select User:
              </label>
              <select
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const user = availableUsers.find(u => u.id === e.target.value);
                  setSelectedUser(user || null);
                }}
                className="w-full p-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm sm:text-base"
                disabled={loadingUsers}
              >
                <option value="">
                  {loadingUsers ? 'Loading users...' : 'Select a user...'}
                </option>
                {availableUsers.map(user => (
                  <option key={`${user.source}-${user.id}`} value={user.id}>
                    {user.displayName} ({user.email})
                    {user.source === 'preAddedUsers' ? ' - Pre-added' : ''}
                  </option>
                ))}
              </select>
              
              {selectedUser && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-800 text-xs sm:text-sm">
                    <strong>Making request for:</strong> {selectedUser.displayName} ({selectedUser.email})
                    {selectedUser.source === 'preAddedUsers' && (
                      <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        Pre-added User
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual User Entry */}
          {requestMode === 'manual_user' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Enter User Details:
              </label>
              <input
                type="text"
                value={manualUserName}
                onChange={(e) => setManualUserName(e.target.value)}
                placeholder="Enter user's full name"
                className="w-full p-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-sm sm:text-base"
              />
              <input
                type="email"
                value={manualUserEmail}
                onChange={(e) => setManualUserEmail(e.target.value)}
                placeholder="Enter user's email address"
                className="w-full p-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-sm sm:text-base"
              />
              
              {manualUserName && manualUserEmail && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-purple-800 text-xs sm:text-sm">
                    <strong>Making request for:</strong> {manualUserName} ({manualUserEmail})
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mx-2 sm:mx-0"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search participant IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
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
            className="card bg-primary-50 border-primary-200 mx-2 sm:mx-0"
          >
            <h3 className="font-semibold text-primary-900 mb-3 flex items-center text-sm sm:text-base">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Selected IDs ({selectedIds.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedIds.map(id => (
                <motion.span
                  key={id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center bg-primary-100 text-primary-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                >
                  {id}
                  <button
                    onClick={() => handleIdToggle(id)}
                    className="ml-1 sm:ml-2 text-primary-600 hover:text-primary-800"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
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
        className="card mx-2 sm:mx-0"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center text-sm sm:text-base">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
                <p className="text-sm sm:text-base">No study IDs available</p>
                <p className="text-xs sm:text-sm mt-2">Contact an administrator to add study IDs</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
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
                    p-2 sm:p-3 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all duration-200
                    ${isSelected
                      ? 'border-primary-500 bg-primary-100 text-primary-700'
                      : isUnavailable
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.participantId}</span>
                    {isSelected && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ml-1" />}
                    {isUnavailable && <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ml-1" />}
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
        className="card mx-2 sm:mx-0"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm sm:text-base"
        />
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center px-2 sm:px-0"
      >
        <button
          onClick={handleSubmitRequest}
          disabled={loading || selectedIds.length === 0 || !reason.trim()}
          className={`
            w-full sm:w-auto flex items-center justify-center px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base
            ${loading || selectedIds.length === 0 || !reason.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-105'
            }
          `}
        >
          {loading ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          )}
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card bg-blue-50 border-blue-200 mx-2 sm:mx-0"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-blue-800">
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
