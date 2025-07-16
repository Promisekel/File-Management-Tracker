import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  User, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  MoreVertical,
  Check,
  X,
  Trash2,
  Edit
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeRemaining, formatDate, isOverdue, getStatusColor } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const FileRequestCard = ({ request, showApprovalActions = false }) => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const statusIcon = {
    pending: Clock,
    active: FileText,
    returned: CheckCircle,
    overdue: AlertTriangle
  };

  const Icon = statusIcon[request.status] || Clock;
  const isRequestOverdue = request.dueDate && isOverdue(request.dueDate);

  const handleApproval = async (approved) => {
    setLoading(true);
    try {
      const updates = {
        status: approved ? 'active' : 'rejected',
        updatedAt: serverTimestamp()
      };

      if (approved) {
        // Set due date to 24 hours from now
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 24);
        updates.dueDate = dueDate;
        updates.approvedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'fileRequests', request.id), updates);
      toast.success(approved ? 'Request approved!' : 'Request rejected');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturned = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'fileRequests', request.id), {
        status: 'returned',
        returnedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success('File marked as returned!');
    } catch (error) {
      console.error('Error marking as returned:', error);
      toast.error('Failed to mark as returned');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'fileRequests', request.id));
      toast.success('Request deleted successfully!');
      setShowDropdown(false);
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-xl p-6 border-l-4 backdrop-blur-sm ${
        request.status === 'overdue' || isRequestOverdue
          ? 'border-l-red-500 bg-gradient-to-br from-red-50/80 to-rose-100/60 border border-red-200/50 shadow-lg shadow-red-500/10'
          : request.status === 'active'
          ? 'border-l-amber-500 bg-gradient-to-br from-amber-50/80 to-orange-100/60 border border-amber-200/50 shadow-lg shadow-amber-500/10'
          : request.status === 'returned'
          ? 'border-l-green-500 bg-gradient-to-br from-green-50/80 to-emerald-100/60 border border-green-200/50 shadow-lg shadow-green-500/10'
          : 'border-l-gray-500 bg-gradient-to-br from-gray-50/80 to-slate-100/60 border border-gray-200/50 shadow-lg'
      }`}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          {/* Status Icon */}
          <div className={`p-2 rounded-lg ${
            request.status === 'overdue' || isRequestOverdue
              ? 'bg-danger-100 text-danger-600'
              : request.status === 'active'
              ? 'bg-warning-100 text-warning-600'
              : request.status === 'returned'
              ? 'bg-success-100 text-success-600'
              : 'bg-gray-100 text-gray-600'
          }`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Request Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900">
                Participant IDs: {request.participantIds?.join(', ')}
              </h3>
              <span className={`status-badge status-${request.status}`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{request.userName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Requested {formatDate(request.createdAt)}</span>
              </div>
            </div>

            {request.reason && (
              <p className="text-sm text-gray-600 mt-2">
                <strong>Reason:</strong> {request.reason}
              </p>
            )}

            {/* Time Information */}
            {request.dueDate && (
              <div className="mt-3">
                <div className={`text-sm font-medium ${
                  isRequestOverdue ? 'text-danger-600' : 'text-warning-600'
                }`}>
                  {formatTimeRemaining(request.dueDate)}
                </div>
                
                {/* Progress Bar */}
                {request.status === 'active' && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ 
                        width: isRequestOverdue ? '100%' : `${Math.min(100, ((new Date() - request.approvedAt?.toDate()) / (24 * 60 * 60 * 1000)) * 100)}%`
                      }}
                      className={`h-2 rounded-full ${
                        isRequestOverdue ? 'bg-danger-500' : 'bg-warning-500'
                      }`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {showApprovalActions && request.status === 'pending' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleApproval(true)}
                disabled={loading}
                className="btn-success text-sm py-1 px-3"
              >
                <Check className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleApproval(false)}
                disabled={loading}
                className="btn-danger text-sm py-1 px-3"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </>
          )}

          {isAdmin && request.status === 'active' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMarkReturned}
              disabled={loading}
              className="btn-success text-sm py-1 px-3"
            >
              Mark Returned
            </motion.button>
          )}

          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-10"
                >
                  {isAdmin && (
                    <button
                      onClick={handleDeleteRequest}
                      disabled={deleting}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin mr-2" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      {deleting ? 'Deleting...' : 'Delete Request'}
                    </button>
                  )}
                  
                  {/* Add more menu items here in the future */}
                  {!isAdmin && (
                    <div className="px-4 py-2 text-gray-500 text-sm">
                      No actions available
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {(loading || deleting) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      )}
    </motion.div>
  );
};

export default FileRequestCard;
