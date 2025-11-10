# Analytics Chart Export Implementation

## Overview
Implemented a modal-based chart selection and export system for the Analytics dashboard that allows users to select multiple charts and export them as a PDF document.

## Features Implemented

### 1. Export Selection Modal
- **Location**: `src/components/stock_tracker/analytics/ExportSelectionModal.jsx`
- **Features**:
  - Grid-based layout showing all 16 available charts
  - Checkbox-style selection with visual feedback
  - Select All / Deselect All functionality
  - Badge showing count of selected charts
  - Responsive design (6 columns on mobile, 4 on tablet)
  - Disabled state during export process
  - Modal cannot be closed during export (backdrop: static, keyboard: disabled)

### 2. Chart Selection
Available charts for export:
1. Category Comparison
2. Top Movers
3. Cost Waterfall
4. Item Trends
5. Variance Heatmap
6. Performance Radar
7. Stock Trends
8. Low Stock
9. Profitability
10. Category Breakdown
11. Side by Side Comparison
12. Comparison Table
13. Inventory Health
14. Performance Breakdown
15. Recommendations
16. Category Distribution

### 3. Export Functionality
- **Technology Stack**:
  - `html2canvas` v1.4.1 - Captures DOM elements as images
  - `jspdf` v2.5.2 - Generates PDF documents
  
- **Export Process**:
  1. User selects charts in modal
  2. Clicks "Export X Charts" button
  3. Progress overlay appears showing percentage complete
  4. Each selected chart is captured as high-quality image (scale: 2)
  5. Charts are added to PDF (one per page, A4 format)
  6. PDF is automatically downloaded with filename: `{hotel_slug}_analytics_{date}.pdf`

### 4. Progress Tracking
- Real-time progress overlay during export
- Shows percentage completion
- Animated progress bar
- Non-dismissible during export process
- Clean, modern UI with icons

### 5. Data Attributes
- Each chart section has `data-chart-section` attribute for reliable identification
- Enables accurate chart selection and capture during export
- Prevents issues with dynamic DOM changes

## User Flow

1. **Open Export Modal**
   - Click "Export PDF" button in Analytics control panel
   - Button is disabled when no period is selected

2. **Select Charts**
   - Click on chart cards to toggle selection
   - Use "Select All" to select all charts at once
   - Use "Deselect All" to clear selection
   - Selected count badge updates in real-time

3. **Export**
   - Click "Export X Charts" button (disabled if none selected)
   - Progress overlay appears
   - Charts are processed one by one
   - PDF downloads automatically when complete

4. **Important Note**
   - Only visible/open charts can be exported
   - Users must open charts they want to export first
   - Warning shown if selected chart is not visible

## Technical Implementation

### Analytics.jsx Changes
- Added imports for `html2canvas` and `jspdf`
- Added `isExporting` and `exportProgress` state
- Implemented `handleExportSelected` async function
- Added `data-chart-section` attributes to chart containers
- Added export progress overlay component
- Export button opens modal instead of direct export

### Export Logic
```javascript
- Creates jsPDF instance (A4 portrait)
- Iterates through selected chart IDs
- Finds chart element using data-chart-section attribute
- Captures element with html2canvas (scale: 2, backgroundColor: white)
- Adds image to PDF (190mm width, calculated height)
- Adds new page for each subsequent chart
- Generates filename with hotel slug and date
- Saves PDF file
```

### Error Handling
- Validates at least one chart is selected
- Checks if chart elements exist in DOM
- Console warnings for missing charts
- User alert for export failures
- Progress reset on error

## Files Modified
1. `src/pages/stock_tracker/Analytics.jsx`
   - Added export functionality
   - Added progress overlay
   - Added data attributes

2. `src/components/stock_tracker/analytics/ExportSelectionModal.jsx` (New)
   - Complete modal implementation
   - Chart selection UI
   - Grid layout with hover effects

## Dependencies
```json
{
  "html2canvas": "^1.4.1",
  "jspdf": "^2.5.2"
}
```

## Future Enhancements (Optional)
- Add option to include filters/period info in PDF header
- Allow custom page orientation (portrait/landscape)
- Add option to export all visible charts with one click
- Include chart titles in PDF pages
- Add watermark or branding to PDF pages
- Support for exporting as images (PNG/JPG) instead of PDF

## Testing Checklist
- ✅ Modal opens when clicking Export PDF button
- ✅ Chart selection toggles work correctly
- ✅ Select All / Deselect All buttons function properly
- ✅ Export button is disabled when no charts selected
- ✅ Progress overlay appears during export
- ✅ Progress percentage updates correctly
- ✅ PDF generates with correct filename format
- ✅ Each selected chart appears on separate page
- ✅ Modal cannot be closed during export
- ✅ Error handling works when charts not visible

## Usage Notes
1. **Performance**: Exporting many charts may take time (100ms per chart + rendering)
2. **Visibility**: Users must open charts before exporting them
3. **Quality**: Charts captured at 2x scale for high-quality output
4. **Format**: All PDFs are A4 portrait format
5. **Filename**: Format is `{hotel_slug}_analytics_{YYYY-MM-DD}.pdf`
