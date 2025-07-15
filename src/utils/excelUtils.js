import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Excel utilities for importing and exporting study IDs
 */

// Template structure for study IDs
export const STUDY_ID_TEMPLATE = [
  {
    participantId: 'STUDY-001',
    description: 'Sample participant description',
    status: 'active',
    category: 'main-study',
    notes: 'Any additional notes about this participant'
  },
  {
    participantId: 'STUDY-002', 
    description: 'Another sample participant',
    status: 'active',
    category: 'control-group',
    notes: 'Control group participant'
  }
];

/**
 * Download Excel template for study IDs
 */
export const downloadStudyIdTemplate = () => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet with template data
    const ws = XLSX.utils.json_to_sheet(STUDY_ID_TEMPLATE);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // participantId
      { wch: 30 }, // description
      { wch: 12 }, // status
      { wch: 15 }, // category
      { wch: 40 }  // notes
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Study IDs Template');
    
    // Create instructions sheet
    const instructions = [
      {
        Field: 'participantId',
        Description: 'Unique identifier for the participant (required)',
        Example: 'STUDY-001, P001, ID-123',
        Rules: 'Must be unique, no spaces or special characters except dash/underscore'
      },
      {
        Field: 'description',
        Description: 'Brief description of the participant (optional)',
        Example: 'Male participant, age 25-30',
        Rules: 'Free text, keep under 100 characters'
      },
      {
        Field: 'status',
        Description: 'Current status of the participant ID',
        Example: 'active, inactive, completed',
        Rules: 'Use: active, inactive, completed, or pending'
      },
      {
        Field: 'category',
        Description: 'Category or group classification (optional)',
        Example: 'main-study, control-group, pilot',
        Rules: 'Free text for grouping purposes'
      },
      {
        Field: 'notes',
        Description: 'Additional notes or comments (optional)',
        Example: 'Special handling required',
        Rules: 'Free text for any additional information'
      }
    ];
    
    const instructionsWs = XLSX.utils.json_to_sheet(instructions);
    instructionsWs['!cols'] = [
      { wch: 15 }, // Field
      { wch: 50 }, // Description
      { wch: 30 }, // Example
      { wch: 50 }  // Rules
    ];
    
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    
    // Download file
    saveAs(data, `study-ids-template-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error creating Excel template:', error);
    throw new Error('Failed to create Excel template');
  }
};

/**
 * Parse uploaded Excel file and return study IDs data
 */
export const parseStudyIdExcel = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet (should be Study IDs Template)
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Validate and clean data
          const validatedData = jsonData
            .filter(row => row.participantId && row.participantId.trim()) // Must have participantId
            .map(row => ({
              participantId: String(row.participantId).trim(),
              description: row.description ? String(row.description).trim() : '',
              status: row.status ? String(row.status).trim().toLowerCase() : 'active',
              category: row.category ? String(row.category).trim() : '',
              notes: row.notes ? String(row.notes).trim() : '',
              createdAt: new Date(),
              updatedAt: new Date()
            }));
          
          // Check for duplicate participantIds within the file
          const participantIds = validatedData.map(item => item.participantId);
          const duplicates = participantIds.filter((id, index) => participantIds.indexOf(id) !== index);
          
          if (duplicates.length > 0) {
            reject(new Error(`Duplicate participant IDs found in file: ${[...new Set(duplicates)].join(', ')}`));
            return;
          }
          
          // Validate status values
          const validStatuses = ['active', 'inactive', 'completed', 'pending'];
          const invalidStatuses = validatedData.filter(item => !validStatuses.includes(item.status));
          
          if (invalidStatuses.length > 0) {
            console.warn('Some rows have invalid status values. Using "active" as default.');
            validatedData.forEach(item => {
              if (!validStatuses.includes(item.status)) {
                item.status = 'active';
              }
            });
          }
          
          resolve(validatedData);
        } catch (parseError) {
          reject(new Error('Failed to parse Excel file. Please ensure it follows the template format.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(new Error('Invalid file format'));
    }
  });
};

/**
 * Export existing study IDs to Excel
 */
export const exportStudyIdsToExcel = (studyIds) => {
  try {
    if (!studyIds || studyIds.length === 0) {
      throw new Error('No study IDs to export');
    }
    
    // Prepare data for export
    const exportData = studyIds.map(item => ({
      participantId: item.participantId,
      description: item.description || '',
      status: item.status || 'active',
      category: item.category || '',
      notes: item.notes || '',
      createdAt: item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : '',
      updatedAt: item.updatedAt ? new Date(item.updatedAt.toDate()).toLocaleDateString() : ''
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // participantId
      { wch: 30 }, // description
      { wch: 12 }, // status
      { wch: 15 }, // category
      { wch: 40 }, // notes
      { wch: 12 }, // createdAt
      { wch: 12 }  // updatedAt
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Study IDs Export');
    
    // Generate and download
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    
    saveAs(data, `study-ids-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};
