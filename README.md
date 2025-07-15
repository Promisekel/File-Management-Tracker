# SMART Study File Tracker

A modern web application for tracking physical study documents using participant IDs. Built with React, Firebase, and TailwindCSS.

## Features

- 🔐 Google Authentication
- 📋 ID-based file request system
- ⏱️ 24-hour countdown tracking
- 📊 Admin dashboard with status monitoring
- 🔔 Automated notifications and reminders
- 📈 Complete return history tracking
- 🎨 Beautiful UI with animations

## Tech Stack

- **Frontend**: React.js + TailwindCSS + Framer Motion
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth (Google only)
- **Hosting**: Firebase Hosting
- **Notifications**: Firebase Cloud Messaging

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Firebase configuration in `src/config/firebase.js`

3. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
src/
├── components/         # Reusable UI components
├── pages/             # Main application pages
├── hooks/             # Custom React hooks
├── config/            # Firebase configuration
├── utils/             # Utility functions
└── contexts/          # React contexts
```

## Environment Variables

Create a `.env` file with your Firebase configuration:

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```
