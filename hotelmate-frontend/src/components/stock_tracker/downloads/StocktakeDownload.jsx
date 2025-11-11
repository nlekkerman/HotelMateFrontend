// src/components/stock_tracker/downloads/StocktakeDownload.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaDownload, FaTimes, FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../../services/api';

export default function StocktakeDownload({ 
  show, 
  onHide, 
  hotelSlug 
}) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  
  // Date-based selection (NOT period ID)
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Fetch data when modal opens
  useEffect(() => {
    if (show && hotelSlug) {
      fetchData();
    }
  }, [show, hotelSlug]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch ONLY periods
      // 🎯 API FILTERING OPTIONS (for future enhancements):
      // ?year=2025              - Filter by year
      // ?month=10               - Filter by month (1-12)
      // ?status=CLOSED          - Filter by status (OPEN/CLOSED)
      // ?start_date=2025-10-01  - Filter by start date (YYYY-MM-DD)
      // ?end_date=2025-10-31    - Filter by end date (YYYY-MM-DD)
      // ?period_type=MONTHLY    - Filter by type (MONTHLY/WEEKLY/CUSTOM)
      
      console.log('📥 Fetching periods from:', `/stock_tracker/${hotelSlug}/periods/`);
      const periodsResponse = await api.get(`/stock_tracker/${hotelSlug}/periods/`);

      const periodsListAll = periodsResponse.data.results || periodsResponse.data || [];
      
      console.log('📊 Periods fetched:', {
        total_count: periodsListAll.length,
        sample_period: periodsListAll[0],
        period_fields: periodsListAll[0] ? Object.keys(periodsListAll[0]) : []
      });
      
      // Filter to show ONLY CLOSED periods for download
      const periodsList = periodsListAll.filter(p => p.is_closed);
      
      // Sort by date (most recent first)
      const sortByDate = (a, b) => {
        const dateA = new Date(a.start_date || a.created_at);
        const dateB = new Date(b.start_date || b.created_at);
        return dateB - dateA; // Descending order (newest first)
      };
      
      periodsList.sort(sortByDate);
      
      console.log('📊 Closed periods for download:', {
        total_periods: periodsListAll.length,
        closed_periods: periodsList.length,
        open_periods: periodsListAll.filter(p => !p.is_closed).length,
        period_names: periodsList.map(p => p.period_name || p.name)
      });

      setPeriods(periodsList);

      // Auto-select first period if available
      if (periodsList.length > 0) {
        setSelectedPeriod(periodsList[0]);
      }
    } catch (err) {
      console.error('❌ Error fetching periods:', err);
      setError('Failed to load periods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedPeriod) {
      setError('Please select a period to download');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      // 🎯 KEY CHANGE: Use DATE-BASED filtering, NOT period ID
      // Filter using period_start and period_end dates from the selected period
      const periodStartDate = selectedPeriod.start_date.split('T')[0]; // YYYY-MM-DD format
      const periodEndDate = selectedPeriod.end_date.split('T')[0];     // YYYY-MM-DD format

      console.log('� Fetching data for date range:', {
        period_name: selectedPeriod.period_name,
        start_date: periodStartDate,
        end_date: periodEndDate,
        month: selectedPeriod.month,
        year: selectedPeriod.year
      });

      // Fetch snapshots using DATE filtering
      const snapshotsEndpoint = `/stock_tracker/${hotelSlug}/periods/${selectedPeriod.id}/snapshots/`;
      console.log('� ===== FETCHING PERIOD DATA =====');
      console.log('📥 API Endpoint:', snapshotsEndpoint);
      console.log('📅 Period Info:', {
        id: selectedPeriod.id,
        name: selectedPeriod.period_name,
        start: periodStartDate,
        end: periodEndDate,
        month: selectedPeriod.month,
        year: selectedPeriod.year
      });
      
      let snapshots = [];
      try {
        const snapshotsResponse = await api.get(snapshotsEndpoint);
        console.log('✅ API Response Status:', snapshotsResponse.status);
        console.log('📦 Raw Response Structure:', {
          has_results: !!snapshotsResponse.data.results,
          is_array: Array.isArray(snapshotsResponse.data),
          data_type: typeof snapshotsResponse.data,
          keys: Object.keys(snapshotsResponse.data)
        });
        
        snapshots = snapshotsResponse.data.results || snapshotsResponse.data || [];
        
        console.log('🔍 ===== SNAPSHOT DATA ANALYSIS =====');
        console.log('📊 Total Snapshots:', snapshots.length);
        
        if (snapshots.length > 0) {
          console.log('🔍 FIRST SNAPSHOT - COMPLETE JSON:');
          console.log(JSON.stringify(snapshots[0], null, 2));
          console.log('');
          console.log('📋 Available Fields:', Object.keys(snapshots[0]));
          console.log('');
          console.log('🔢 Sample Values from First Snapshot:');
          console.log({
            stock_item_name: snapshots[0].stock_item_name,
            item_name: snapshots[0].item_name,
            name: snapshots[0].name,
            opening_stock_qty: snapshots[0].opening_stock_qty,
            opening_qty: snapshots[0].opening_qty,
            opening: snapshots[0].opening,
            purchases_qty: snapshots[0].purchases_qty,
            purchase_qty: snapshots[0].purchase_qty,
            purchases: snapshots[0].purchases,
            waste_qty: snapshots[0].waste_qty,
            waste: snapshots[0].waste,
            closing_stock_qty: snapshots[0].closing_stock_qty,
            closing_qty: snapshots[0].closing_qty,
            counted_qty: snapshots[0].counted_qty,
            variance_qty: snapshots[0].variance_qty,
            variance: snapshots[0].variance,
            variance_value: snapshots[0].variance_value,
            variance_cost: snapshots[0].variance_cost,
            category_name: snapshots[0].category_name,
            category: snapshots[0].category
          });
          
          // Show first 3 items to see patterns
          console.log('');
          console.log('📋 First 3 Snapshots Summary:');
          snapshots.slice(0, 3).forEach((snap, idx) => {
            console.log(`Item ${idx + 1}:`, {
              name: snap.stock_item_name || snap.item_name || snap.name,
              category: snap.category_name || snap.category,
              opening: snap.opening_stock_qty || snap.opening_qty || snap.opening,
              purchases: snap.purchases_qty || snap.purchase_qty || snap.purchases,
              closing: snap.closing_stock_qty || snap.closing_qty || snap.counted_qty
            });
          });
        }
        console.log('🔍 ===== END SNAPSHOT ANALYSIS =====');
        console.log('');
      } catch (snapshotErr) {
        console.error('❌ Failed to fetch snapshots:', snapshotErr);
        setError('Failed to fetch period snapshot data. This period may not have snapshot data yet.');
        setDownloading(false);
        return;
      }

      console.log('✅ Total snapshots for PDF:', snapshots.length);

      if (snapshots.length === 0) {
        setError('No snapshot data found for this period. The period may be empty or not yet finalized.');
        setDownloading(false);
        return;
      }

      const periodName = selectedPeriod.period_name || selectedPeriod.name || `Period_${selectedPeriod.month}_${selectedPeriod.year}`;

      // Generate PDF
      await generatePDF(selectedPeriod, snapshots, periodName);

      // Close modal after successful download
      setTimeout(() => {
        onHide();
      }, 500);
    } catch (err) {
      console.error('❌ Download error:', err);
      setError(`Failed to download file: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const generatePDF = async (data, snapshots, filename) => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Format the date for display and filename
    const reportDate = new Date(data.start_date || data.created_at);
    const monthYear = reportDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const filenameSafe = monthYear.replace(' ', '_');

    // Add title
    pdf.setFontSize(18);
    pdf.text(`Period Report - ${data.period_name || filename}`, 14, 20);
    
    // Add metadata
    pdf.setFontSize(10);
    pdf.text(`Period: ${data.period_name || 'N/A'}`, 14, 30);
    pdf.text(`Start Date: ${reportDate.toLocaleDateString()}`, 14, 36);
    pdf.text(`Status: ${data.is_closed ? 'Closed' : 'Open'}`, 14, 42);
    if (data.end_date) {
      pdf.text(`End Date: ${new Date(data.end_date).toLocaleDateString()}`, 100, 36);
    }
    pdf.text(`Month/Year: ${data.month}/${data.year}`, 100, 42);

    console.log('📄 ===== GENERATING PDF =====');
    console.log('📊 Data to Process:', {
      total_snapshots: snapshots.length,
      period_name: data.period_name || filename,
      start_date: data.start_date,
      end_date: data.end_date
    });

    // Log first snapshot structure to understand what fields are available
    if (snapshots.length > 0) {
      console.log('� PDF Generation - First Snapshot Check:');
      console.log('All Fields:', Object.keys(snapshots[0]));
      console.log('Attempting to Extract:');
      console.log({
        item_name: snapshots[0].stock_item_name,
        category: snapshots[0].category_name,
        opening: snapshots[0].opening_stock_qty,
        purchases: snapshots[0].purchases_qty,
        waste: snapshots[0].waste_qty,
        closing: snapshots[0].closing_stock_qty,
        variance: snapshots[0].variance_qty,
        variance_value: snapshots[0].variance_value
      });
    }

    // Group snapshots by category_code
    const groupedSnapshots = snapshots.reduce((acc, snapshot) => {
      // Use category_code from period snapshots
      const cat = snapshot.category_code || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(snapshot);
      return acc;
    }, {});
    
    console.log('📊 Grouped snapshots by category:', Object.keys(groupedSnapshots).map(cat => ({
      category: cat,
      count: groupedSnapshots[cat].length
    })));

    let currentY = 55;

    // Process each category
    for (const [category, categorySnapshots] of Object.entries(groupedSnapshots)) {
      // Check if we need a new page
      if (currentY > 180) {
        pdf.addPage();
        currentY = 20;
      }

      // Category header
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(category, 14, currentY);
      currentY += 7;
      pdf.setFont(undefined, 'normal');

      // Prepare table data - using period snapshot structure
      const tableData = categorySnapshots.map((snapshot, index) => {
        const safeNumber = (value) => {
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        };

        // 🔍 Log FIRST snapshot in EACH category
        if (index === 0) {
          console.log(`\n🏷️ ===== CATEGORY: ${category} =====`);
          console.log('� RAW SNAPSHOT OBJECT:');
          console.log(JSON.stringify(snapshot, null, 2));
          console.log('');
          console.log('� ALL AVAILABLE FIELDS:', Object.keys(snapshot));
        }

        // ⚠️ PERIOD SNAPSHOTS have different structure than stocktake snapshots
        // Period snapshots only have CLOSING stock data, not opening/purchases/waste
        const itemName = snapshot.item_name || snapshot.stock_item_name || snapshot.name || 'Unknown';
        const itemSku = snapshot.item_sku || snapshot.sku || '';
        
        // Period snapshots use these fields:
        const closingFullUnits = safeNumber(snapshot.closing_full_units);
        const closingPartialUnits = safeNumber(snapshot.closing_partial_units);
        const totalServings = safeNumber(snapshot.total_servings);
        const closingStockValue = safeNumber(snapshot.closing_stock_value);
        const unitCost = safeNumber(snapshot.unit_cost);
        const costPerServing = safeNumber(snapshot.cost_per_serving);

        // Log EXTRACTED values for first item
        if (index === 0) {
          console.log('✅ EXTRACTED VALUES:');
          console.log({
            itemName,
            itemSku,
            closingFullUnits: `${closingFullUnits} (from: ${snapshot.closing_full_units})`,
            closingPartialUnits: `${closingPartialUnits} (from: ${snapshot.closing_partial_units})`,
            totalServings: `${totalServings} (from: ${snapshot.total_servings})`,
            closingStockValue: `€${closingStockValue} (from: ${snapshot.closing_stock_value})`,
            unitCost: `€${unitCost} (from: ${snapshot.unit_cost})`,
            costPerServing: `€${costPerServing} (from: ${snapshot.cost_per_serving})`
          });
          console.log('');
          console.log('📋 ROW FOR PDF TABLE:', [
            `${itemSku} - ${itemName}`,
            closingFullUnits.toFixed(2),
            closingPartialUnits.toFixed(2),
            totalServings.toFixed(2),
            `€${unitCost.toFixed(2)}`,
            `€${costPerServing.toFixed(2)}`,
            `€${closingStockValue.toFixed(2)}`
          ]);
          console.log(`===== END ${category} =====\n`);
        }

        return [
          `${itemSku} - ${itemName}`,
          closingFullUnits.toFixed(2),
          closingPartialUnits.toFixed(2),
          totalServings.toFixed(2),
          `€${unitCost.toFixed(2)}`,
          `€${costPerServing.toFixed(2)}`,
          `€${closingStockValue.toFixed(2)}`
        ];
      });

      // Add table using autoTable - PERIOD SNAPSHOT structure
      autoTable(pdf, {
        startY: currentY,
        head: [['SKU - Item', 'Cases', 'Bottles', 'Servings', 'Unit Cost', 'Cost/Serving', 'Stock Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 80 },  // SKU - Item name
          1: { cellWidth: 20, halign: 'right' },  // Cases
          2: { cellWidth: 20, halign: 'right' },  // Bottles
          3: { cellWidth: 25, halign: 'right' },  // Servings
          4: { cellWidth: 25, halign: 'right' },  // Unit Cost
          5: { cellWidth: 30, halign: 'right' },  // Cost per Serving
          6: { cellWidth: 30, halign: 'right' }   // Stock Value
        },
        margin: { left: 14 }
      });

      currentY = pdf.lastAutoTable.finalY + 10;
    }

    // Add summary at the end
    if (currentY > 250) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Summary', 14, currentY);
    currentY += 7;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);

    const totalStockValue = snapshots.reduce((sum, snapshot) => {
      const stockValue = parseFloat(snapshot.closing_stock_value) || 0;
      return sum + stockValue;
    }, 0);
    
    const totalServings = snapshots.reduce((sum, snapshot) => {
      const servings = parseFloat(snapshot.total_servings) || 0;
      return sum + servings;
    }, 0);

    pdf.text(`Total Items: ${snapshots.length}`, 14, currentY);
    currentY += 6;
    pdf.text(`Total Servings: ${totalServings.toFixed(2)}`, 14, currentY);
    currentY += 6;
    pdf.text(`Total Stock Value: €${totalStockValue.toFixed(2)}`, 14, currentY);
    currentY += 10;

    // Add Category Breakdown section
    pdf.setFont(undefined, 'bold');
    pdf.text('Category Breakdown', 14, currentY);
    currentY += 7;
    pdf.setFont(undefined, 'normal');

    // Calculate category totals
    const categoryBreakdown = Object.entries(groupedSnapshots).map(([category, categorySnapshots]) => {
      const categoryStockValue = categorySnapshots.reduce((sum, snapshot) => {
        const stockValue = parseFloat(snapshot.closing_stock_value) || 0;
        return sum + stockValue;
      }, 0);
      const categoryServings = categorySnapshots.reduce((sum, snapshot) => {
        const servings = parseFloat(snapshot.total_servings) || 0;
        return sum + servings;
      }, 0);
      return [
        category,
        categorySnapshots.length.toString(),
        categoryServings.toFixed(2),
        `€${categoryStockValue.toFixed(2)}`
      ];
    });

    // Check if we need a new page for the breakdown table
    if (currentY > 220) {
      pdf.addPage();
      currentY = 20;
    }

    // Add category breakdown table
    autoTable(pdf, {
      startY: currentY,
      head: [['Category', 'Items', 'Total Servings', 'Stock Value']],
      body: categoryBreakdown,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: 14 }
    });

    currentY = pdf.lastAutoTable.finalY + 10;
    pdf.setFontSize(9);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, currentY);

    // Save the PDF with month-year naming
    pdf.save(`Stocktake_${filenameSafe}.pdf`);
  };

  const handleClose = () => {
    if (!downloading) {
      setSelectedPeriod(null);
      setError(null);
      onHide();
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      size="lg"
      centered
      backdrop={downloading ? 'static' : true}
      keyboard={!downloading}
    >
      <Modal.Header closeButton={!downloading}>
        <Modal.Title>
          <FaDownload className="me-2" />
          Download Period Report
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Period Selection */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">
                Select Period (Closed Periods Only)
              </Form.Label>
              <Form.Text className="d-block mb-2 text-muted">
                Periods are filtered by start/end dates, not by ID
              </Form.Text>
              {periods.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  No closed periods available for download
                </Alert>
              ) : (
                <Form.Select
                  value={selectedPeriod?.id || ''}
                  onChange={(e) => {
                    const period = periods.find(p => p.id === parseInt(e.target.value));
                    setSelectedPeriod(period || null);
                  }}
                  disabled={downloading}
                  size="lg"
                >
                  <option value="">-- Select Period --</option>
                  {periods.map(period => {
                    const startDate = new Date(period.start_date);
                    const endDate = new Date(period.end_date);
                    
                    return (
                      <option key={period.id} value={period.id}>
                        {period.period_name || `${period.month}/${period.year}`} ({startDate.toLocaleDateString('en-GB')} - {endDate.toLocaleDateString('en-GB')})
                      </option>
                    );
                  })}
                </Form.Select>
              )}
            </Form.Group>

            {selectedPeriod && (
              <Alert variant="info" className="mb-0">
                <small>
                  <strong>Ready to download PDF:</strong>{' '}
                  {selectedPeriod.period_name || `${selectedPeriod.month}/${selectedPeriod.year}`}
                  <br />
                  <strong>Date Range:</strong> {new Date(selectedPeriod.start_date).toLocaleDateString('en-GB')} - {new Date(selectedPeriod.end_date).toLocaleDateString('en-GB')}
                  <br />
                  <strong>Filter Method:</strong> Using period dates (not ID)
                </small>
              </Alert>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={handleClose}
          disabled={downloading}
        >
          <FaTimes className="me-2" />
          Cancel
        </Button>
        <Button 
          variant="success" 
          onClick={handleDownload}
          disabled={!selectedPeriod || downloading || loading}
        >
          {downloading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Downloading...
            </>
          ) : (
            <>
              <FaDownload className="me-2" />
              Download PDF
            </>
          )}
        </Button>
      </Modal.Footer>

    </Modal>
  );
}
