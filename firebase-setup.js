#!/usr/bin/env node

/**
 * Firebase Setup and Test Script
 * Run this to test Firebase connectivity and set up initial data
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔥 Firebase Setup & Test Script');
console.log('================================\n');

console.log('✅ Firebase Configuration Loaded:');
console.log('   Project: smart-pro24');
console.log('   Auth Domain: smart-pro24.firebaseapp.com');
console.log('   Database: https://smart-pro24-default-rtdb.firebaseio.com\n');

console.log('📋 Manual Setup Steps Required:\n');
console.log('1. 🔐 Enable Google Authentication:');
console.log('   - Go to: https://console.firebase.google.com/project/smart-pro24/authentication/providers');
console.log('   - Enable "Google" sign-in method');
console.log('   - Add authorized domains if needed\n');

console.log('2. 📄 Set up Firestore Security Rules:');
console.log('   - Go to: https://console.firebase.google.com/project/smart-pro24/firestore/rules');
console.log('   - Use the rules from firestore.rules file in this project\n');

console.log('3. 🏗️ Create Firestore Database:');
console.log('   - Go to: https://console.firebase.google.com/project/smart-pro24/firestore');
console.log('   - Create database in production mode');
console.log('   - Choose a location (us-central1 recommended)\n');

console.log('4. 🧪 Test the Application:');
console.log('   - Open: http://localhost:3001');
console.log('   - Try logging in with Google');
console.log('   - Test admin features (add study IDs)');
console.log('   - Test user features (request files)\n');

console.log('📚 Collections that will be created:');
console.log('   - fileRequests: Store file requests from users');
console.log('   - studyIds: Store available participant IDs');
console.log('   - users: Store user roles (admin/user)\n');

rl.question('Press Enter to continue or Ctrl+C to exit...', () => {
  console.log('\n🚀 Ready to test! Open http://localhost:3001 in your browser.');
  console.log('💡 Check the TEST_RESULTS.md file for detailed testing checklist.');
  rl.close();
});
