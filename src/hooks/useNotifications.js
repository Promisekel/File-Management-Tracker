import { useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { notifyFileOverdue, notifyFileDueSoon } from '../utils/notificationService';

export const useNotifications = () => {
  const { currentUser, isAdmin } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Listen for overdue requests
    const checkOverdueRequests = () => {
      const activeRequestsQuery = query(
        collection(db, 'fileRequests'),
        where('status', '==', 'active'),
        orderBy('dueDate', 'asc')
      );

      const unsubscribe = onSnapshot(activeRequestsQuery, (snapshot) => {
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
          if (isAdmin) {
            toast.error(
              `File overdue: ${request.participantIds?.join(', ')} (${request.userName})`,
              {
                id: `overdue-${request.id}`,
                duration: 10000
              }
            );
          } else if (request.userId === currentUser.uid) {
            toast.error(
              `Your file is overdue: ${request.participantIds?.join(', ')}`,
              {
                id: `overdue-${request.id}`,
                duration: 10000
              }
            );
            
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
            toast(
              `Files due in ${request.hoursRemaining} hour(s): ${request.participantIds?.join(', ')}`,
              {
                icon: '⏰',
                id: `due-soon-${request.id}`,
                duration: 8000
              }
            );
            
            // Create database notification for files due soon
            try {
              await notifyFileDueSoon(request, request.hoursRemaining);
            } catch (error) {
              console.error('Error creating due soon notification:', error);
            }
          }
        });
      });

      return unsubscribe;
    };

    // Listen for new pending requests (admin only)
    const listenForPendingRequests = () => {
      if (!isAdmin) return () => {};

      const pendingQuery = query(
        collection(db, 'fileRequests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      let lastNotifiedCount = 0;

      const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
        const pendingCount = snapshot.size;
        
        if (pendingCount > lastNotifiedCount && lastNotifiedCount > 0) {
          const newRequests = pendingCount - lastNotifiedCount;
          toast(
            `${newRequests} new file request${newRequests > 1 ? 's' : ''} pending approval`,
            {
              icon: '📋',
              duration: 6000
            }
          );
        }
        
        lastNotifiedCount = pendingCount;
      });

      return unsubscribe;
    };

    // Set up all listeners
    const unsubscribeOverdue = checkOverdueRequests();
    const unsubscribePending = listenForPendingRequests();

    // Cleanup function
    return () => {
      unsubscribeOverdue();
      unsubscribePending();
    };
  }, [currentUser, isAdmin]);

  return null; // This hook doesn't return anything, it just handles notifications
};
