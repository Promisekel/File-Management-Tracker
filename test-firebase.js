// Simple Firebase connection test
const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

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

console.log('Testing Firebase connection...');
console.log('Project ID:', firebaseConfig.projectId);
console.log('Auth Domain:', firebaseConfig.authDomain);

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
  console.log('✅ Firestore connected');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
}
