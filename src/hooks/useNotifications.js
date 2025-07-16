import { useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { notifyFileOverdue, notifyFileDueSoon, sendBrowserNotification, requestNotificationPermission } from '../utils/notificationService';

export const useNotifications = () => {
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Request notification permission when user is authenticated
    requestNotificationPermission();

    // Listen for new notifications in database
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Send browser notification for new notifications
          sendBrowserNotification(notification.title, {
            body: notification.message,
            tag: `notification-${notification.type}-${change.doc.id}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            data: {
              type: notification.type,
              id: change.doc.id,
              relatedRequestId: notification.relatedRequestId
            }
          });

          // Also show toast
          const toastMessage = `${notification.title}: ${notification.message}`;
          
          switch (notification.type) {
            case 'request_approved':
              toast.success(toastMessage, { duration: 6000, icon: '✅' });
              break;
            case 'request_rejected':
              toast.error(toastMessage, { duration: 6000, icon: '❌' });
              break;
            case 'file_overdue':
              toast.error(toastMessage, { duration: 8000, icon: '⚠️' });
              break;
            case 'file_due_soon':
              toast(toastMessage, { duration: 6000, icon: '⏰' });
              break;
            case 'file_returned':
              toast.success(toastMessage, { duration: 5000, icon: '📁' });
              break;
            default:
              toast(toastMessage, { duration: 4000, icon: '🔔' });
          }
        }
      });
    });

    // Listen for overdue requests
    const activeRequestsQuery = query(
      collection(db, 'fileRequests'),
      where('status', '==', 'active'),
      orderBy('dueDate', 'asc')
    );

    const unsubscribeOverdue = onSnapshot(activeRequestsQuery, (snapshot) => {
      const now = new Date();
      const overdueRequests = [];
      const dueSoonRequests = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const dueDate = data.dueDate?.toDate();
        
        if (dueDate) {
          const timeDiff = dueDate - now;
          const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
          
          if (timeDiff <= 0) {
            // Overdue
            overdueRequests.push({
              id: doc.id,
              ...data
            });
          } else if (hoursRemaining <= 2 && hoursRemaining > 0) {
            // Due soon (within 2 hours)
            dueSoonRequests.push({
              id: doc.id,
              ...data,
              hoursRemaining
            });
          }
        }
      });

      // Handle overdue requests
      overdueRequests.forEach(async (request) => {
        const message = `Files overdue: ${request.participantIds?.join(', ')}`;
        
        if (isAdmin) {
          toast.error(`${message} (${request.userName})`, {
            id: `overdue-${request.id}`,
            duration: 10000
          });
          
          // Send browser notification for admin
          sendBrowserNotification('⚠️ Files Overdue', {
            body: `${message} (${request.userName})`,
            tag: `overdue-admin-${request.id}`,
            requireInteraction: true
          });
          
        } else if (request.userId === currentUser.uid) {
          toast.error(`Your files are overdue: ${request.participantIds?.join(', ')}`, {
            id: `overdue-${request.id}`,
            duration: 10000
          });
          
          // Send browser notification
          sendBrowserNotification('⚠️ Your Files Are Overdue!', {
            body: `Please return: ${request.participantIds?.join(', ')}`,
            tag: `overdue-user-${request.id}`,
            requireInteraction: true
          });
          
          // Create database notification for overdue files
          try {
            await notifyFileOverdue(request);
          } catch (error) {
            console.error('Error creating overdue notification:', error);
          }
        }
      });

      // Handle due soon requests
      dueSoonRequests.forEach(async (request) => {
        if (!isAdmin && request.userId === currentUser.uid) {
          const message = `Files due in ${request.hoursRemaining} hour(s): ${request.participantIds?.join(', ')}`;
          
          toast(message, {
            icon: '⏰',
            id: `due-soon-${request.id}`,
            duration: 8000
          });
          
          // Send browser notification
          sendBrowserNotification('⏰ Files Due Soon!', {
            body: message,
            tag: `due-soon-${request.id}`,
            requireInteraction: false
          });
          
          // Create database notification for files due soon
          try {
            await notifyFileDueSoon(request, request.hoursRemaining);
          } catch (error) {
            console.error('Error creating due soon notification:', error);
          }
        }
      });
    });

    // Listen for pending requests (for admins)
    let unsubscribePending = () => {};
    
    if (isAdmin) {
      const pendingRequestsQuery = query(
        collection(db, 'fileRequests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      unsubscribePending = onSnapshot(pendingRequestsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const request = change.doc.data();
            const message = `New request from ${request.userName}: ${request.participantIds?.join(', ')}`;
            
            toast(message, {
              icon: '📋',
              duration: 6000
            });
            
            // Send browser notification for new requests
            sendBrowserNotification('📋 New File Request', {
              body: message,
              tag: `new-request-${change.doc.id}`,
              requireInteraction: true
            });
          }
        });
      });
    }

    // Cleanup function
    return () => {
      unsubscribeNotifications();
      unsubscribeOverdue();
      unsubscribePending();
    };
  }, [currentUser, isAdmin]);

  return null; // This hook doesn't return anything, it just handles notifications
};
