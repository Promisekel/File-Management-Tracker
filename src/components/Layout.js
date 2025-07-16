import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Plus, 
  Settings, 
  History, 
  LogOut,
  FileText,
  Database,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';

const Layout = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/request', icon: Plus, label: 'Request Files' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/test', icon: Database, label: 'Test' },
    ...(isAdmin ? [
      { path: '/admin', icon: Settings, label: 'Admin' },
      { path: '/manage-ids', icon: Database, label: 'Manage Study IDs' }
    ] : [])
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-[60]">
        <button
          onClick={toggleMobileMenu}
          className="p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-600" />
          ) : (
            <Menu className="w-6 h-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200">
          <FileText className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">SMART File Tracker</h1>
            <p className="text-xs text-gray-500">Study File Management</p>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <img
              src={currentUser?.photoURL || 'https://via.placeholder.com/40'}
              alt="User Avatar"
              className="w-10 h-10 rounded-full"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {currentUser?.displayName}
              </p>
              <p className="text-xs text-gray-500">
                {isAdmin ? 'Administrator' : 'User'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                      ${isActive 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3 text-gray-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 transition-all duration-300">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="ml-12 md:ml-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {navigationItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500">
                Monitor all file requests and system activity
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationCenter />
              <div className="hidden sm:flex items-center">
                <img
                  src={currentUser?.photoURL || 'https://via.placeholder.com/32'}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {currentUser?.displayName}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main className="px-4 md:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
