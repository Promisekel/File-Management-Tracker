# SMART Study File Tracker - Development Guide

## 🎯 Project Overview

The SMART Study File Tracker is a modern web application designed to track physical study documents using participant IDs. It provides a complete workflow for file request management, approval processes, and automated tracking with beautiful UI and real-time updates.

## ✨ Key Features

### Core Functionality
- **Google Authentication Only** - Secure login with Google accounts
- **ID-Based File Requests** - No file uploads, only tracking by participant IDs
- **24-Hour Countdown System** - Automatic tracking with visual progress indicators
- **Admin Approval Workflow** - Request approval system with notifications
- **Real-time Status Updates** - Live dashboard with color-coded status indicators
- **Automated Notifications** - In-app alerts for overdue files and status changes
- **Complete History Tracking** - Comprehensive audit trail with export capabilities

### User Interface
- **Beautiful Modern Design** - TailwindCSS with custom animations
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Smooth Animations** - Framer Motion powered transitions
- **Real-time Updates** - Live data synchronization across users
- **Status Color Coding** - Visual indicators for different file states
- **Interactive Dashboards** - Comprehensive overview with statistics

## 🏗️ Architecture

### Frontend Stack
- **React 18** - Modern React with hooks and context
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Router v6** - Client-side routing
- **React Hot Toast** - Beautiful toast notifications

### Backend Stack
- **Firebase Firestore** - NoSQL document database
- **Firebase Authentication** - Google OAuth integration
- **Firebase Hosting** - Static site hosting
- **Firestore Security Rules** - Database access control

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── Layout.js        # Main application layout
│   ├── StatCard.js      # Statistics display cards
│   ├── FileRequestCard.js # Request item display
│   └── CountdownTimer.js # Timer with progress bar
├── pages/               # Main application pages
│   ├── LoginPage.js     # Authentication page
│   ├── Dashboard.js     # Main dashboard
│   ├── RequestPage.js   # File request form
│   ├── AdminPage.js     # Admin management
│   └── HistoryPage.js   # Request history
├── hooks/               # Custom React hooks
│   ├── useFileRequests.js # File request management
│   └── useNotifications.js # Real-time notifications
├── contexts/            # React context providers
│   └── AuthContext.js   # Authentication state
├── config/              # Configuration files
│   └── firebase.js      # Firebase initialization
├── utils/               # Utility functions
│   └── dateUtils.js     # Date formatting helpers
└── index.css           # Global styles and Tailwind
```

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 16+ installed
- Firebase project created
- Google OAuth configured in Firebase

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd smart-study-file-tracker

# Install dependencies (already done)
npm install

# Copy environment template
cp .env.example .env
```

### 3. Firebase Configuration

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication with Google provider
4. Enable Firestore Database in test mode
5. Get your config values from Project Settings

#### Update .env File
```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
```

### 4. Setup Admin Access

After first login, manually add admin privileges:
1. Go to Firestore Console
2. Create collection: `admins`
3. Add document with your user UID as document ID
4. Set data: `{ isAdmin: true }`

### 5. Start Development
```bash
npm start
```

## 🔧 Configuration Details

### Firestore Collections

#### fileRequests
```javascript
{
  id: "auto-generated",
  userId: "user-uid",
  userEmail: "user@example.com",
  userName: "User Name",
  participantIds: ["PART-001", "PART-002"],
  reason: "Research analysis",
  status: "pending|active|returned|overdue",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  approvedAt: "timestamp", // when approved
  dueDate: "timestamp", // 24 hours after approval
  returnedAt: "timestamp" // when marked as returned
}
```

#### admins
```javascript
{
  id: "user-uid",
  isAdmin: true,
  createdAt: "timestamp"
}
```

#### adminEmails (optional)
```javascript
{
  id: "email-address",
  email: "admin@example.com",
  addedBy: "admin-uid",
  addedAt: "timestamp"
}
```

### Status Flow
1. **pending** - Request submitted, awaiting admin approval
2. **active** - Approved, 24-hour countdown started
3. **returned** - Files returned successfully
4. **overdue** - 24-hour deadline passed

### Security Rules
The application includes comprehensive Firestore security rules:
- Users can only read/write their own requests
- Admins can access all requests and admin collections
- Automatic admin privilege checking

## 🎨 UI Components Guide

### Color Scheme
- **Primary**: Blue (#3b82f6) - Main actions, navigation
- **Success**: Green (#22c55e) - Completed, returned files
- **Warning**: Orange (#f59e0b) - Active requests, time warnings
- **Danger**: Red (#ef4444) - Overdue files, errors

### Component Usage

#### StatCard
```jsx
<StatCard
  title="Active Requests"
  value={stats.active}
  icon={Clock}
  color="warning"
  trend="+2 from yesterday"
/>
```

#### FileRequestCard
```jsx
<FileRequestCard
  request={requestData}
  showApprovalActions={true}
/>
```

#### CountdownTimer
```jsx
<CountdownTimer
  dueDate={request.dueDate}
  status={request.status}
  className="mt-4"
/>
```

## 📱 Features Deep Dive

### Real-time Notifications
- Automatic overdue detection
- New request alerts for admins
- Status change notifications for users
- Visual toast notifications

### Dashboard Analytics
- Total requests counter
- Active/pending/overdue breakdowns
- Color-coded status indicators
- Progress tracking with animations

### Admin Features
- Bulk approve/reject actions
- User management
- Data export capabilities
- System overview statistics

### User Experience
- Intuitive request creation
- Visual file availability indicators
- Progress tracking with countdown
- Complete request history

## 🚀 Deployment

### Firebase Hosting
```bash
# Build the application
npm run build

# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not done)
firebase init

# Deploy to Firebase
firebase deploy
```

### Environment Variables
Ensure all environment variables are set in your hosting environment.

## 🔐 Security Considerations

1. **Authentication** - Google OAuth only, no email/password
2. **Authorization** - Role-based access with Firestore rules
3. **Data Protection** - User data isolation, admin privilege verification
4. **Input Validation** - Client-side and server-side validation

## 🧪 Testing

### Manual Testing Checklist
- [ ] Google authentication works
- [ ] Users can create requests
- [ ] Admins can approve/reject requests
- [ ] Countdown timers work correctly
- [ ] Notifications appear appropriately
- [ ] Data exports function properly
- [ ] Mobile responsiveness

### Test Data
The application includes sample participant IDs (PART-001 through PART-020) for testing purposes.

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Firebase configuration
   - Verify Google OAuth setup
   - Ensure domain is authorized

2. **Database Permission Errors**
   - Check Firestore rules
   - Verify admin collection setup
   - Confirm user authentication

3. **Styling Issues**
   - Ensure TailwindCSS is properly configured
   - Check for CSS build errors
   - Verify responsive design

### Debug Mode
Enable Firebase debug mode:
```javascript
// In firebase.js
import { connectFirestoreEmulator } from 'firebase/firestore';

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## 📈 Future Enhancements

### Potential Features
- Email notifications
- File categories/tags
- Advanced analytics
- Mobile app
- Integration with document management systems
- Batch operations
- Custom countdown durations
- Report generation

### Performance Optimization
- Implement virtualization for large lists
- Add caching strategies
- Optimize bundle size
- Add service worker for offline support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for efficient study file management**
