import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

const CountdownTimer = ({ dueDate, status, className = '' }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!dueDate || status !== 'active') return;

    const timer = setInterval(() => {
      const now = new Date();
      const targetDate = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
      const diffInMilliseconds = targetDate - now;

      if (diffInMilliseconds <= 0) {
        setIsOverdue(true);
        const overdueDiff = Math.abs(diffInMilliseconds);
        const overdueHours = Math.floor(overdueDiff / (1000 * 60 * 60));
        const overdueMinutes = Math.floor((overdueDiff % (1000 * 60 * 60)) / (1000 * 60));
        const overdueSeconds = Math.floor((overdueDiff % (1000 * 60)) / 1000);

        setTimeRemaining({
          hours: overdueHours,
          minutes: overdueMinutes,
          seconds: overdueSeconds,
          isOverdue: true
        });
      } else {
        setIsOverdue(false);
        const hours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffInMilliseconds % (1000 * 60)) / 1000);

        setTimeRemaining({
          hours,
          minutes,
          seconds,
          isOverdue: false
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [dueDate, status]);

  if (!timeRemaining || status !== 'active') return null;

  const { hours, minutes, seconds } = timeRemaining;
  const totalHours = 24;
  const hoursElapsed = isOverdue ? totalHours : totalHours - hours - (minutes / 60);
  const progressPercentage = Math.min(100, (hoursElapsed / totalHours) * 100);

  const getColorScheme = () => {
    if (isOverdue) return 'danger';
    if (hours < 2) return 'warning';
    return 'success';
  };

  const colorScheme = getColorScheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${className}`}
    >
      {/* Time Display */}
      <div className={`flex items-center space-x-2 ${
        isOverdue ? 'text-danger-600' : hours < 2 ? 'text-warning-600' : 'text-success-600'
      }`}>
        {isOverdue ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        <span className="font-mono text-sm font-semibold">
          {isOverdue ? 'OVERDUE: ' : ''}
          {String(hours).padStart(2, '0')}:
          {String(minutes).padStart(2, '0')}:
          {String(seconds).padStart(2, '0')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>0h</span>
          <span className={`font-semibold ${
            isOverdue ? 'text-danger-600' : 'text-gray-800'
          }`}>
            {isOverdue ? `${hours}h ${minutes}m ${seconds}s overdue` : `${hours}h ${minutes}m ${seconds}s left`}
          </span>
          <span>24h</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
            className={`h-2 rounded-full ${
              isOverdue
                ? 'bg-danger-500 animate-pulse'
                : colorScheme === 'warning'
                ? 'bg-warning-500'
                : 'bg-success-500'
            }`}
          />
        </div>
      </div>

      {/* Status Messages */}
      {isOverdue && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-danger-600 font-medium"
        >
          ⚠️ This file is overdue and should be returned immediately
        </motion.div>
      )}

      {!isOverdue && hours < 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-warning-600 font-medium"
        >
          ⏰ Less than 2 hours remaining - please prepare for return
        </motion.div>
      )}
    </motion.div>
  );
};

export default CountdownTimer;
