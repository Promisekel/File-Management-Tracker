import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, color, trend, onClick }) => {
  const colorClasses = {
    primary: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-primary-600 border border-blue-200/50',
    success: 'bg-gradient-to-br from-green-50 to-emerald-100 text-success-600 border border-green-200/50',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-100 text-warning-600 border border-amber-200/50',
    danger: 'bg-gradient-to-br from-red-50 to-rose-100 text-danger-600 border border-red-200/50'
  };

  const trendColorClasses = {
    primary: 'text-primary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600'
  };

  const cardGradients = {
    primary: 'bg-gradient-to-br from-blue-500/5 to-indigo-500/10 border border-blue-200/30',
    success: 'bg-gradient-to-br from-green-500/5 to-emerald-500/10 border border-green-200/30',
    warning: 'bg-gradient-to-br from-amber-500/5 to-orange-500/10 border border-amber-200/30',
    danger: 'bg-gradient-to-br from-red-500/5 to-rose-500/10 border border-red-200/30'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-xl p-6 ${cardGradients[color]} ${
        onClick ? 'cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300' : ''
      }`}
      onClick={onClick}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {trend && (
            <p className={`text-xs font-medium ${trendColorClasses[color]}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-4 rounded-xl ${colorClasses[color]} shadow-lg backdrop-blur-sm`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
