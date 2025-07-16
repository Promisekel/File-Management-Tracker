import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Save, 
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { downloadStudyIdTemplate, parseStudyIdExcel, exportStudyIdsToExcel } from '../utils/excelUtils';

const ManageStudyIds = () => {
  const { currentUser } = useAuth();
  const [studyIds, setStudyIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newId, setNewId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [bulkIds, setBulkIds] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const studyIdsQuery = query(
      collection(db, 'studyIds'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(studyIdsQuery, (snapshot) => {
      const idsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudyIds(idsData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredIds = studyIds.filter(item =>
    item.participantId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddId = async () => {
    if (!newId.trim()) {
      toast.error('Please enter a participant ID');
      return;
    }

    // Check if ID already exists
    const existingId = studyIds.find(item => 
      item.participantId.toLowerCase() === newId.trim().toLowerCase()
    );
    
    if (existingId) {
      toast.error('This participant ID already exists');
      return;
    }

    try {
      await addDoc(collection(db, 'studyIds'), {
        participantId: newId.trim().toUpperCase(),
        description: newDescription.trim() || '',
        status: 'active',
        category: '',
        notes: '',
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      setNewId('');
      setNewDescription('');
      setIsAddingNew(false);
      toast.success('Study ID added successfully!');
    } catch (error) {
      console.error('Error adding study ID:', error);
      toast.error('Failed to add study ID');
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkIds.trim()) {
      toast.error('Please enter participant IDs');
      return;
    }

    const idsToAdd = bulkIds
      .split('\n')
      .map(line => line.trim().toUpperCase())
      .filter(id => id.length > 0);

    if (idsToAdd.length === 0) {
      toast.error('No valid IDs found');
      return;
    }

    // Check for duplicates
    const existingIds = studyIds.map(item => item.participantId);
    const duplicates = idsToAdd.filter(id => existingIds.includes(id));
    
    if (duplicates.length > 0) {
      toast.error(`Duplicate IDs found: ${duplicates.join(', ')}`);
      return;
    }

    try {
      const promises = idsToAdd.map(id => 
        addDoc(collection(db, 'studyIds'), {
          participantId: id,
          description: newDescription.trim() || '',
          status: 'active',
          category: '',
          notes: '',
          isActive: true,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          updatedAt: serverTimestamp()
        })
      );

      await Promise.all(promises);
      setBulkIds('');
      setNewDescription('');
      setShowBulkAdd(false);
      toast.success(`${idsToAdd.length} study IDs added successfully!`);
    } catch (error) {
      console.error('Error adding bulk study IDs:', error);
      toast.error('Failed to add study IDs');
    }
  };

  // Excel import/export functions
  const handleDownloadTemplate = async () => {
    try {
      await downloadStudyIdTemplate();
      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleExportToExcel = async () => {
    if (studyIds.length === 0) {
      toast.error('No study IDs to export');
      return;
    }

    try {
      setExporting(true);
      await exportStudyIdsToExcel(studyIds);
      toast.success('Study IDs exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export study IDs');
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    try {
      setImporting(true);
      const importedData = await parseStudyIdExcel(file);
      
      if (importedData.length === 0) {
        toast.error('No valid data found in the Excel file');
        return;
      }

      // Check for existing IDs
      const existingIds = studyIds.map(item => item.participantId.toLowerCase());
      const newIds = importedData.filter(item => 
        !existingIds.includes(item.participantId.toLowerCase())
      );
      const duplicateIds = importedData.filter(item => 
        existingIds.includes(item.participantId.toLowerCase())
      );

      if (duplicateIds.length > 0) {
        toast.error(`Found ${duplicateIds.length} duplicate IDs that will be skipped: ${duplicateIds.map(d => d.participantId).join(', ')}`);
      }

      if (newIds.length === 0) {
        toast.error('All participant IDs already exist in the database');
        return;
      }

      // Add new IDs to Firestore
      const promises = newIds.map(item => 
        addDoc(collection(db, 'studyIds'), {
          participantId: item.participantId.toUpperCase(),
          description: item.description || '',
          status: item.status || 'active',
          category: item.category || '',
          notes: item.notes || '',
          isActive: true,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          updatedAt: serverTimestamp()
        })
      );

      await Promise.all(promises);
      
      toast.success(`Successfully imported ${newIds.length} study IDs!`);
      if (duplicateIds.length > 0) {
        toast.error(`Skipped ${duplicateIds.length} duplicate IDs`);
      }
      
    } catch (error) {
      console.error('Error importing Excel file:', error);
      toast.error(error.message || 'Failed to import Excel file');
    } finally {
      setImporting(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleEditId = async (id) => {
    if (!editData.participantId?.trim()) {
      toast.error('Please enter a participant ID');
      return;
    }

    // Check if new ID already exists (excluding current one)
    const existingId = studyIds.find(item => 
      item.participantId.toLowerCase() === editData.participantId.trim().toLowerCase() &&
      item.id !== id
    );
    
    if (existingId) {
      toast.error('This participant ID already exists');
      return;
    }

    try {
      await updateDoc(doc(db, 'studyIds', id), {
        participantId: editData.participantId.trim().toUpperCase(),
        description: editData.description?.trim() || '',
        status: editData.status || 'active',
        category: editData.category?.trim() || '',
        notes: editData.notes?.trim() || '',
        isActive: editData.isActive,
        updatedAt: serverTimestamp()
      });

      setEditingId(null);
      setEditData({});
      toast.success('Study ID updated successfully!');
    } catch (error) {
      console.error('Error updating study ID:', error);
      toast.error('Failed to update study ID');
    }
  };

  const handleDeleteId = async (id, participantId) => {
    if (!window.confirm(`Are you sure you want to delete ${participantId}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'studyIds', id));
      toast.success('Study ID deleted successfully!');
    } catch (error) {
      console.error('Error deleting study ID:', error);
      toast.error('Failed to delete study ID');
    }
  };

  const exportIds = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Participant ID,Description,Status,Created Date\n"
      + filteredIds.map(item => 
          `${item.participantId},"${item.description}",${item.isActive ? 'Active' : 'Inactive'},${item.createdAt?.toDate()?.toLocaleDateString()}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `study_ids_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-primary-600" />
            Manage Study IDs
          </h1>
          <p className="text-gray-600 mt-1">
            Add, edit, and manage participant IDs for the study
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Excel Template Download */}
          <button
            onClick={handleDownloadTemplate}
            className="btn-secondary flex items-center"
            title="Download Excel template"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Template
          </button>
          
          {/* Excel Import */}
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={importing}
            />
            <button
              className="btn-secondary flex items-center"
              disabled={importing}
              title="Import from Excel"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Import Excel'}
            </button>
          </div>
          
          {/* Excel Export */}
          <button
            onClick={handleExportToExcel}
            className="btn-secondary flex items-center"
            disabled={exporting || studyIds.length === 0}
            title="Export to Excel"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          
          {/* CSV Export (keep existing) */}
          <button
            onClick={exportIds}
            className="btn-secondary flex items-center"
            title="Export to CSV"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
          
          <button
            onClick={() => setShowBulkAdd(true)}
            className="btn-secondary flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Add
          </button>
          <button
            onClick={() => setIsAddingNew(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New ID
          </button>
        </div>
      </motion.div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">
            {studyIds.length}
          </div>
          <div className="text-sm text-gray-600">Total Study IDs</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-success-600">
            {studyIds.filter(item => item.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Active IDs</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-600">
            {studyIds.filter(item => !item.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Inactive IDs</div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by participant ID or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Add New ID Modal */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add New Study ID
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participant ID *
                  </label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g., PART-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Additional notes about this participant..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewId('');
                    setNewDescription('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddId}
                  className="btn-primary"
                >
                  Add ID
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary-600" />
                  Bulk Add Study IDs
                </h3>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">How to bulk add Study IDs:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Enter one participant ID per line</li>
                        <li>• IDs will be automatically converted to uppercase</li>
                        <li>• Duplicates will be automatically skipped</li>
                        <li>• Invalid or empty lines will be ignored</li>
                        <li>• You can paste from Excel, CSV, or any text source</li>
                        <li>• Add an optional description that applies to all IDs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Examples */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Examples:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Simple format:</p>
                      <code className="block bg-white p-2 rounded border text-gray-800 font-mono text-xs">
                        PART-001<br/>
                        PART-002<br/>
                        PART-003
                      </code>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Mixed formats:</p>
                      <code className="block bg-white p-2 rounded border text-gray-800 font-mono text-xs">
                        SUB001<br/>
                        participant-002<br/>
                        STUDY_ID_003
                      </code>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Participant IDs Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Participant IDs (one per line) *
                    </label>
                    <textarea
                      value={bulkIds}
                      onChange={(e) => setBulkIds(e.target.value)}
                      placeholder={`PART-001\nPART-002\nPART-003\nSUB-004\nSTUDY-005`}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {bulkIds.split('\n').filter(id => id.trim()).length} IDs ready to add
                      </p>
                      <button
                        type="button"
                        onClick={() => setBulkIds('')}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Enter a description that will be applied to all participant IDs..."
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This description will be added to all participant IDs in the list
                    </p>
                  </div>
                </div>

                {/* Preview Section */}
                {bulkIds.trim() && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Preview:</h4>
                    <p className="text-sm text-green-800">
                      Ready to add <strong>{bulkIds.split('\n').filter(id => id.trim()).length} participant IDs</strong>
                      {newDescription.trim() && (
                        <span> with description: "<em>{newDescription.trim()}</em>"</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBulkAdd(false);
                      setBulkIds('');
                      setNewDescription('');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkAdd}
                    disabled={!bulkIds.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add All IDs
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Study IDs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card overflow-hidden"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredIds.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No matching study IDs found' : 'No study IDs added yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms.'
                : 'Start by adding participant IDs to track study files.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="btn-primary"
              >
                Add Your First Study ID
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participant ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {filteredIds.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editData.participantId || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              participantId: e.target.value
                            })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">
                            {item.participantId}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingId === item.id ? (
                          <textarea
                            value={editData.description || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              description: e.target.value
                            })}
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          />
                        ) : (
                          <div className="text-sm text-gray-600 max-w-xs">
                            {item.description || 'No description'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === item.id ? (
                          <select
                            value={editData.isActive ? 'active' : 'inactive'}
                            onChange={(e) => setEditData({
                              ...editData,
                              isActive: e.target.value === 'active'
                            })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : (
                          <span className={`status-badge ${
                            item.isActive ? 'status-returned' : 'status-pending'
                          }`}>
                            {item.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.createdAt?.toDate()?.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === item.id ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEditId(item.id)}
                              className="text-success-600 hover:text-success-900"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditData({});
                              }}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setEditData({
                                  participantId: item.participantId,
                                  description: item.description,
                                  isActive: item.isActive
                                });
                              }}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteId(item.id, item.participantId)}
                              className="text-danger-600 hover:text-danger-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ManageStudyIds;
