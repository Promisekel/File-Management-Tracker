import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

// Notification types
export const NOTIFICATION_TYPES = {
  REQUEST_SUBMITTED: 'request_submitted',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  FILE_OVERDUE: 'file_overdue',
  FILE_DUE_SOON: 'file_due_soon',
  FILE_RETURNED: 'file_returned'
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Send browser notification
export const sendBrowserNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/manifest.json', // You can add a proper icon path
      badge: '/manifest.json',
      tag: 'smart-tracker',
      requireInteraction: true,
      ...options
    });

    // Auto close after 10 seconds if user doesn't interact
    setTimeout(() => notification.close(), 10000);

    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
};

// Create a notification
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedRequestId = null,
  metadata = {},
  sendBrowser = true
}) => {
  try {
    // Create database notification
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      relatedRequestId,
      metadata,
      read: false,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Send browser notification
    if (sendBrowser) {
      sendBrowserNotification(title, {
        body: message,
        tag: `notification-${type}-${Date.now()}`,
        data: { type, relatedRequestId, metadata }
      });
    }

    // Also show toast notification
    toast.success(title, {
      description: message,
      duration: 5000
    });

  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Notify user when their request is submitted
export const notifyRequestSubmitted = async (request) => {
  const participantIds = Array.isArray(request.participantIds) 
    ? request.participantIds.join(', ') 
    : request.participantIds || 'Unknown';

  await createNotification({
    userId: request.userId,
    type: NOTIFICATION_TYPES.REQUEST_SUBMITTED,
    title: 'Request Submitted',
    message: `Your file request for ${participantIds} has been submitted and is awaiting approval.`,
    relatedRequestId: request.id,
    metadata: {
      participantIds: request.participantIds,
      reason: request.reason
    }
  });
};

// Notify admin about new pending requests
export const notifyAdminNewRequest = async (request, adminUsers) => {
  const participantIds = Array.isArray(request.participantIds) 
    ? request.participantIds.join(', ') 
    : request.participantIds || 'Unknown';

  // Create notifications for all admin users
  const promises = adminUsers.map(adminUserId =>
    createNotification({
      userId: adminUserId,
      type: NOTIFICATION_TYPES.REQUEST_SUBMITTED,
      title: 'New File Request',
      message: `${request.userName} requested access to ${participantIds}`,
      relatedRequestId: request.id,
      metadata: {
        requesterName: request.userName,
        requesterEmail: request.userEmail,
        participantIds: request.participantIds,
        reason: request.reason
      }
    })
  );

  await Promise.all(promises);
};

// Notify user when request is approved
export const notifyRequestApproved = async (request, dueDate) => {
  const participantIds = Array.isArray(request.participantIds) 
    ? request.participantIds.join(', ') 
    : request.participantIds || 'Unknown';

  const dueDateStr = dueDate ? dueDate.toLocaleDateString() : 'N/A';

  await createNotification({
    userId: request.userId,
    type: NOTIFICATION_TYPES.REQUEST_APPROVED,
    title: 'Request Approved! 🎉',
    message: `Your request for ${participantIds} has been approved. Files must be returned by ${dueDateStr}.`,
    relatedRequestId: request.id,
    metadata: {
      participantIds: request.participantIds,
      dueDate: dueDate,
      approvedBy: request.approvedBy
    }
  });
};

// Notify user when request is rejected
export const notifyRequestRejected = async (request, rejectionReason = '') => {
  const participantIds = Array.isArray(request.participantIds) 
    ? request.participantIds.join(', ') 
    : request.participantIds || 'Unknown';

  await createNotification({
    userId: request.userId,
    type: NOTIFICATION_TYPES.REQUEST_REJECTED,
    title: 'Request Rejected',
    message: `Your request for ${participantIds} has been rejected. ${rejectionReason}`,
    relatedRequestId: request.id,
    metadata: {
      participantIds: request.participantIds,
      rejectionReason: rejectionReason,
      rejectedBy: request.rejectedBy
    }
  });
};

// Notify user about overdue files
export const notifyFileOverdue = async (request) => {
  const participantIds = Array.isArray(request.participantIds) 
    ? request.participantIds.join(', ') 
    : request.participantIds || 'Unknown';

  await createNotification({
    userId: request.userId,
    type: NOTIFICATION_TYPES.FILE_OVERDUE,
    title: '⚠️ Files Overdue!',
    message: `Your files for ${participantIds} are overdue. Please return them immediately.`,
    relatedRequestId: request.id,
    metadata: {
      participantIds: request.participantIds,
      dueDate: request.dueDate,
      overdueTime: new Date() - request.dueDate?.toDate()
    }
  });
};

// Notify user about files due soon
export const notifyFileDueSoon = async (request, hoursRemaining) => {
  const participantIds = Array.isArray(request.participantIds) 
    ? request.participantIds.join(', ') 
    : request.participantIds || 'Unknown';

  await createNotification({
    userId: request.userId,
    type: NOTIFICATION_TYPES.FILE_DUE_SOON,
    title: 'Files Due Soon ⏰',
    message: `Your files for ${participantIds} are due in ${hoursRemaining} hours.`,
    relatedRequestId: request.id,
    metadata: {
      participantIds: request.participantIds,
      dueDate: request.dueDate,
      hoursRemaining: hoursRemaining
    }
  });
};

// Notify user when files are returned
export const notifyFileReturned = async (request) => {
  const participantIds = Array.isArray(request.participantIds) 
    ? request.participantIds.join(', ') 
    : request.participantIds || 'Unknown';

  await createNotification({
    userId: request.userId,
    type: NOTIFICATION_TYPES.FILE_RETURNED,
    title: 'Files Returned ✅',
    message: `Files for ${participantIds} have been successfully returned.`,
    relatedRequestId: request.id,
    metadata: {
      participantIds: request.participantIds,
      returnedAt: new Date()
    }
  });
};

// Get all admin user IDs
export const getAdminUserIds = async () => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'admin')
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return [];
  }
};

// Clean up old notifications (optional utility)
export const cleanupOldNotifications = async (userId, daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldNotificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('createdAt', '<', cutoffDate)
    );

    const snapshot = await getDocs(oldNotificationsQuery);
    
    // Mark as deleted instead of actually deleting
    const promises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        deleted: true,
        deletedAt: serverTimestamp()
      })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
};
