import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useFileRequests = (filterUserId = null) => {
  const { currentUser, isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let requestsQuery;

    if (filterUserId) {
      // Filter for specific user
      requestsQuery = query(
        collection(db, 'fileRequests'),
        where('userId', '==', filterUserId),
        orderBy('createdAt', 'desc')
      );
    } else if (isAdmin) {
      // Admin sees all requests
      requestsQuery = query(
        collection(db, 'fileRequests'),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Regular users see only their requests
      requestsQuery = query(
        collection(db, 'fileRequests'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRequests(requestsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching requests:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, isAdmin, filterUserId]);

  const createRequest = async (participantIds, reason) => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const requestData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        participantIds,
        reason,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'fileRequests'), requestData);
      toast.success('Request submitted successfully!');
      return docRef.id;
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
      throw error;
    }
  };

  const updateRequest = async (requestId, updates) => {
    try {
      await updateDoc(doc(db, 'fileRequests', requestId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      toast.success('Request updated successfully!');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
      throw error;
    }
  };

  const approveRequest = async (requestId) => {
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 24);

    await updateRequest(requestId, {
      status: 'active',
      dueDate,
      approvedAt: serverTimestamp()
    });
  };

  const rejectRequest = async (requestId) => {
    await updateRequest(requestId, {
      status: 'rejected'
    });
  };

  const markReturned = async (requestId) => {
    await updateRequest(requestId, {
      status: 'returned',
      returnedAt: serverTimestamp()
    });
  };

  const markOverdue = async (requestId) => {
    await updateRequest(requestId, {
      status: 'overdue'
    });
  };

  return {
    requests,
    loading,
    error,
    createRequest,
    updateRequest,
    approveRequest,
    rejectRequest,
    markReturned,
    markOverdue
  };
};
