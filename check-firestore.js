// Test with Firebase Admin SDK to check collection
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize with service account
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://smart-pro24-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function checkCollections() {
  try {
    console.log('Checking collections...');
    
    // List all collections
    const collections = await db.listCollections();
    console.log('Available collections:');
    collections.forEach(col => console.log(' -', col.id));
    
    // Check studyIds collection specifically
    const studyIdsRef = db.collection('studyIds');
    const snapshot = await studyIdsRef.get();
    
    console.log(`\nstudyIds collection: ${snapshot.size} documents`);
    
    if (snapshot.size > 0) {
      console.log('Sample documents:');
      snapshot.docs.slice(0, 3).forEach(doc => {
        console.log(' -', doc.id, ':', doc.data());
      });
    } else {
      console.log('studyIds collection is empty or does not exist');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCollections();
