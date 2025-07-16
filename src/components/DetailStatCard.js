import React from 'react';
import { motion } from 'framer-motion';

const DetailStatCard = ({ title, value, icon: Icon, color, delay = 0 }) => {
  const colorClasses = {
    warning: {
      card: 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200/50 shadow-amber-500/10',
      icon: 'bg-gradient-to-br from-amber-100 to-orange-200 text-amber-600 border border-amber-300/50',
      text: 'text-amber-600'
    },
    danger: {
      card: 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200/50 shadow-red-500/10',
      icon: 'bg-gradient-to-br from-red-100 to-rose-200 text-red-600 border border-red-300/50',
      text: 'text-red-600'
    },
    primary: {
      card: 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200/50 shadow-blue-500/10',
      icon: 'bg-gradient-to-br from-blue-100 to-indigo-200 text-blue-600 border border-blue-300/50',
      text: 'text-blue-600'
    },
    success: {
      card: 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200/50 shadow-green-500/10',
      icon: 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-600 border border-green-300/50',
      text: 'text-green-600'
    },
    purple: {
      card: 'bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200/50 shadow-purple-500/10',
      icon: 'bg-gradient-to-br from-purple-100 to-violet-200 text-purple-600 border border-purple-300/50',
      text: 'text-purple-600'
    },
    orange: {
      card: 'bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200/50 shadow-orange-500/10',
      icon: 'bg-gradient-to-br from-orange-100 to-amber-200 text-orange-600 border border-orange-300/50',
      text: 'text-orange-600'
    }
  };

  const theme = colorClasses[color] || colorClasses.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.05, 
        y: -8,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}
      transition={{ 
        delay,
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      className={`relative overflow-hidden rounded-2xl p-8 border shadow-xl backdrop-blur-sm ${theme.card}`}
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Enhanced shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/15 to-transparent rounded-full blur-xl"></div>
      
      <div className="relative flex flex-col h-full">
        {/* Icon positioned at top right */}
        <div className="flex justify-end mb-4">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className={`p-4 rounded-2xl shadow-lg backdrop-blur-sm ${theme.icon}`}
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
            className={`text-5xl font-bold leading-none ${theme.text}`}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {value}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default DetailStatCard;
