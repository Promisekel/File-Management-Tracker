import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Set persistence to local storage for persistent login
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

export const googleProvider = new GoogleAuthProvider();

// Add custom parameters for better Vercel compatibility
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
