#!/usr/bin/env node

/**
 * SMART Study File Tracker Setup Script
 * This script helps you set up the Firebase project and initial configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 SMART Study File Tracker Setup');
console.log('=====================================\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
    console.log('📝 Please edit .env file with your Firebase configuration\n');
  } else {
    console.log('❌ .env.example not found. Please create your .env file manually.\n');
  }
} else {
  console.log('✅ .env file already exists\n');
}

console.log('📋 Setup Instructions:');
console.log('======================\n');

console.log('1. 🔥 Firebase Setup:');
console.log('   - Go to https://console.firebase.google.com/');
console.log('   - Create a new project or select existing one');
console.log('   - Enable Authentication (Google provider)');
console.log('   - Enable Firestore Database');
console.log('   - Copy your config values to .env file\n');

console.log('2. 🛠️ Install Dependencies:');
console.log('   npm install\n');

console.log('3. 🔐 Admin Setup:');
console.log('   - After first login, manually add your UID to Firestore');
console.log('   - Collection: "admins"');
console.log('   - Document ID: your-user-uid');
console.log('   - Data: { isAdmin: true }\n');

console.log('4. 🚀 Start Development:');
console.log('   npm start\n');

console.log('5. 🌐 Deploy to Firebase:');
console.log('   - npm run build');
console.log('   - firebase deploy\n');

console.log('📚 Additional Resources:');
console.log('========================');
console.log('- Firebase Console: https://console.firebase.google.com/');
console.log('- Firebase CLI: https://firebase.google.com/docs/cli');
console.log('- React Documentation: https://reactjs.org/docs');
console.log('- TailwindCSS: https://tailwindcss.com/docs\n');

console.log('🎉 Setup complete! Happy coding!');
