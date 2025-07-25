import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const checkAdminStatus = async (user) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      console.log('Checking admin status for:', user.email); // Debug log
      
      // Check if user email is the designated admin
      const adminEmails = [
        'promisebansah12@gmail.com',
        'promisebansah@yahoo.com'
      ];
      const isDesignatedAdmin = adminEmails.includes(user.email);
      
      console.log('Is designated admin:', isDesignatedAdmin); // Debug log
      
      // If user is designated admin, set admin immediately
      if (isDesignatedAdmin) {
        setIsAdmin(true);
        console.log('Set as admin - designated admin'); // Debug log
        
        // Still store user data
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'admin',
          isDesignatedAdmin: true,
          lastLogin: serverTimestamp()
        }, { merge: true });
        return;
      }
      
      // Check if user was pre-added
      const preAddedUserDoc = await getDoc(doc(db, 'preAddedUsers', user.email));
      const wasPreAdded = preAddedUserDoc.exists();
      let preAddedRole = 'user';
      
      if (wasPreAdded) {
        preAddedRole = preAddedUserDoc.data().role;
        // Update the pre-added user status to 'active' since they've now logged in
        await setDoc(doc(db, 'preAddedUsers', user.email), {
          ...preAddedUserDoc.data(),
          status: 'active',
          firstLoginAt: serverTimestamp()
        }, { merge: true });
        
        if (preAddedRole === 'admin') {
          setIsAdmin(true);
          console.log('Set as admin - pre-added admin'); // Debug log
        }
      }
      
      // Determine final role
      const userRole = preAddedRole === 'admin' ? 'admin' : 'user';
      
      // Store user in users collection for easy lookups
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: userRole,
        wasPreAdded: wasPreAdded,
        lastLogin: serverTimestamp()
      }, { merge: true });
      
      // Also check Firestore admins collection for additional admins
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      const isAdditionalAdmin = adminDoc.exists();
      
      // Update role if user was made admin through admin panel
      if (isAdditionalAdmin) {
        await setDoc(doc(db, 'users', user.uid), {
          role: 'admin'
        }, { merge: true });
        setIsAdmin(true);
        console.log('Set as admin - additional admin'); // Debug log
      } else if (!wasPreAdded || preAddedRole !== 'admin') {
        setIsAdmin(false);
        console.log('Set as regular user'); // Debug log
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        await checkAdminStatus(user);
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin,
    signInWithGoogle,
    logout,
    loading,
    authInitialized
  };

  return (
    <AuthContext.Provider value={value}>
      {authInitialized && children}
    </AuthContext.Provider>
  );
};
