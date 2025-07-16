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
      whileHover={{ 
        scale: 1.05, 
        y: -8,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}
      transition={{ 
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      className={`relative overflow-hidden rounded-2xl p-8 shadow-xl ${cardGradients[color]} ${
        onClick ? 'cursor-pointer hover:shadow-2xl transition-all duration-300' : ''
      }`}
      onClick={onClick}
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Enhanced background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"></div>
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-xl"></div>
      
      <div className="relative flex flex-col h-full">
        {/* Icon positioned at top right */}
        <div className="flex justify-end mb-4">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className={`p-4 rounded-2xl ${colorClasses[color]} shadow-lg backdrop-blur-sm`}
          >
            <Icon className="w-7 h-7" />
          </motion.div>
        </div>
        
        {/* Content pushed towards bottom */}
        <div className="flex-1 flex flex-col justify-end">
          <motion.p 
            className="text-lg font-semibold text-gray-700 mb-2"
            whileHover={{ x: 2 }}
            transition={{ duration: 0.2 }}
          >
            {title}
          </motion.p>
          <motion.p 
            className="text-5xl font-bold text-gray-900 mb-2 leading-none"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {value}
          </motion.p>
          {trend && (
            <motion.p 
              className={`text-sm font-semibold ${trendColorClasses[color]}`}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.2 }}
            >
              {trend}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
