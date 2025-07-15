import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const TestPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [testResults, setTestResults] = useState([]);
  const [studyIds, setStudyIds] = useState([]);

  const addTestResult = (test, result, details = '') => {
    setTestResults(prev => [...prev, { test, result, details, timestamp: new Date().toISOString() }]);
  };

  useEffect(() => {
    addTestResult('Authentication Loading', authLoading ? 'Loading' : 'Complete');
    addTestResult('Current User', currentUser ? 'Authenticated' : 'Not Authenticated', currentUser?.email || '');
  }, [currentUser, authLoading]);

  const testFirestoreConnection = async () => {
    if (!currentUser) {
      addTestResult('Firestore Test', 'Failed', 'User not authenticated');
      return;
    }

    try {
      addTestResult('Firestore Test', 'Starting', 'Setting up listener');
      
      const studyIdsQuery = query(
        collection(db, 'studyIds'), 
        where('isActive', '==', true),
        orderBy('participantId', 'asc')
      );
      
      const unsubscribe = onSnapshot(studyIdsQuery, (snapshot) => {
        const idsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setStudyIds(idsData);
        addTestResult('Firestore Test', 'Success', `Found ${idsData.length} study IDs`);
        console.log('Study IDs:', idsData);
      }, (error) => {
        addTestResult('Firestore Test', 'Error', `${error.code}: ${error.message}`);
        console.error('Firestore error:', error);
      });

      return unsubscribe;
    } catch (error) {
      addTestResult('Firestore Test', 'Exception', error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Firebase Connection Test</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Authentication Status</h3>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {authLoading ? 'Yes' : 'No'}</p>
              <p><strong>User:</strong> {currentUser ? currentUser.email : 'Not authenticated'}</p>
              <p><strong>UID:</strong> {currentUser?.uid || 'N/A'}</p>
            </div>
          </div>

          <div>
            <button 
              onClick={testFirestoreConnection}
              disabled={!currentUser}
              className="btn-primary"
            >
              Test Firestore Connection
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Test Results</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className={`p-3 rounded border-l-4 ${
                  result.result === 'Success' ? 'border-green-500 bg-green-50' :
                  result.result === 'Error' || result.result === 'Failed' ? 'border-red-500 bg-red-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{result.test}:</span> {result.result}
                      {result.details && <div className="text-sm text-gray-600 mt-1">{result.details}</div>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Study IDs Found ({studyIds.length})</h3>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {studyIds.map(item => (
                <div key={item.id} className="p-2 bg-gray-100 rounded text-sm">
                  {item.participantId}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
