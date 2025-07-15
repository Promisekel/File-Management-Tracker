// Simple test to check Firestore connection
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBQ8094jCo8OlGWySkuFcmcO4JUXbtUAAg",
  authDomain: "smart-pro24.firebaseapp.com",
  databaseURL: "https://smart-pro24-default-rtdb.firebaseio.com",
  projectId: "smart-pro24",
  storageBucket: "smart-pro24.firebasestorage.app",
  messagingSenderId: "986473364599",
  appId: "1:986473364599:web:a8c437a3ac2da633bf9a72",
  measurementId: "G-XTEMTD43C1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testConnection() {
  try {
    console.log('Testing Firestore connection...');
    const querySnapshot = await getDocs(collection(db, 'studyIds'));
    console.log('Success! Found', querySnapshot.size, 'documents in studyIds collection');
    querySnapshot.forEach((doc) => {
      console.log(doc.id, ' => ', doc.data());
    });
  } catch (error) {
    console.error('Error connecting to Firestore:', error);
  }
}

testConnection();
