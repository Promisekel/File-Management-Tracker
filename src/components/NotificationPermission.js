import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check } from 'lucide-react';
import { requestNotificationPermission } from '../utils/notificationService';
import toast from 'react-hot-toast';

const NotificationPermission = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');

  useEffect(() => {
    // Check if we need to show the permission prompt
    const checkPermission = () => {
      if ('Notification' in window) {
        const status = Notification.permission;
        setPermissionStatus(status);
        
        // Show prompt if permission is default (not granted or denied)
        if (status === 'default') {
          // Delay showing the prompt to avoid overwhelming the user immediately
          setTimeout(() => {
            setShowPrompt(true);
          }, 2000);
        }
      }
    };

    checkPermission();
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    
    if (granted) {
      setPermissionStatus('granted');
      setShowPrompt(false);
      toast.success('🔔 Notifications enabled! You\'ll now receive important updates.', {
        duration: 4000,
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    } else {
      setPermissionStatus('denied');
      setShowPrompt(false);
      toast.error('Notifications blocked. You can enable them in your browser settings.', {
        duration: 6000,
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    toast('You can enable notifications later in your browser settings.', {
      icon: '💡',
      duration: 4000,
    });
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 card-shine">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Enable Notifications
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get instant alerts for file requests, approvals, and deadlines - just like WhatsApp notifications!
                </p>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleRequestPermission}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Enable
                  </button>
                  
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPermission;
