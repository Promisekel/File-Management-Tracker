# Excel Import/Export Guide for Study IDs

## 📋 How to Use Excel Import Feature

### Step 1: Download Template
1. Go to **Manage Study IDs** page (admin only)
2. Click the **"Template"** button to download the Excel template
3. The downloaded file will contain:
   - **Study IDs Template** sheet with sample data
   - **Instructions** sheet with field explanations

### Step 2: Fill the Template
Open the downloaded Excel file and fill in your data:

| Field | Description | Required | Example | Notes |
|-------|-------------|----------|---------|-------|
| **participantId** | Unique identifier | ✅ Yes | STUDY-001, P001, ID-123 | Must be unique, no spaces |
| **description** | Brief description | ❌ No | Male participant, age 25-30 | Keep under 100 characters |
| **status** | Current status | ❌ No | active, inactive, completed | Default: active |
| **category** | Group classification | ❌ No | main-study, control-group | For grouping purposes |
| **notes** | Additional comments | ❌ No | Special handling required | Free text |

### Step 3: Import the File
1. Click the **"Import Excel"** button
2. Select your filled Excel file
3. The system will:
   - Validate all data
   - Check for duplicates
   - Show import results
   - Add new IDs to the database

### Step 4: Verify Import
- Check the study IDs list to confirm all data was imported
- Review any error messages for skipped entries
- Export the data to verify everything looks correct

## 📤 Export Features

### Export to Excel
- **Export Excel**: Download all current study IDs in Excel format
- Includes all fields: ID, description, status, category, notes, dates
- Perfect for backup or sharing with team members

### Export to CSV
- **CSV**: Download simple comma-separated values file
- Lighter format, good for basic data analysis
- Compatible with most spreadsheet programs

## ⚠️ Important Notes

### Data Validation
- **Participant IDs must be unique** - duplicates will be skipped
- **Empty participant IDs are ignored** - rows without IDs won't be imported
- **Invalid status values** default to "active"
- **File format must be .xlsx or .xls**

### Admin Access
- Only users with admin privileges can access this feature
- Currently configured admin: **promisebansah12@gmail.com**

### Best Practices
1. **Always download a fresh template** for the latest format
2. **Test with a small batch first** before importing large datasets
3. **Keep a backup** of your original data before importing
4. **Check for duplicates** in your Excel file before uploading
5. **Use consistent naming conventions** for participant IDs

## 🔧 Troubleshooting

### Common Issues
- **"No valid data found"**: Check that participantId column has values
- **"Duplicate IDs found"**: Some IDs already exist in database
- **"Invalid file format"**: Upload only .xlsx or .xls files
- **"Failed to parse Excel"**: Ensure file follows template structure

### File Requirements
- Maximum recommended: 1000 rows per import
- File size limit: 10MB
- Required columns: participantId (others are optional)
- Use the provided template structure

## 📊 Database Structure

Study IDs are stored with these fields:
```
{
  participantId: "STUDY-001",      // Unique identifier
  description: "Sample desc",      // Optional description
  status: "active",                // active, inactive, completed, pending
  category: "main-study",          // Optional grouping
  notes: "Special notes",          // Optional additional info
  isActive: true,                  // System field
  createdAt: timestamp,            // Auto-generated
  createdBy: "user-id",           // Auto-generated
  updatedAt: timestamp             // Auto-generated
}
```

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Verify your admin access
3. Ensure Excel file follows template format
4. Contact system administrator for technical support

---
*Last updated: July 15, 2025*
