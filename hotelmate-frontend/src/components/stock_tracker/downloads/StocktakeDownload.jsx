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
  const [stocktakes, setStocktakes] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  
  // Selection state
  const [selectedType, setSelectedType] = useState('stocktake'); // 'stocktake' or 'period'
  const [selectedId, setSelectedId] = useState('');

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
      // Fetch both stocktakes and periods
      const [stocktakesResponse, periodsResponse] = await Promise.all([
        api.get(`/stock_tracker/${hotelSlug}/stocktakes/`),
        api.get(`/stock_tracker/${hotelSlug}/periods/`)
      ]);

      const stocktakesList = stocktakesResponse.data.results || stocktakesResponse.data || [];
      const periodsList = periodsResponse.data.results || periodsResponse.data || [];

      setStocktakes(stocktakesList);
      setPeriods(periodsList);

      // Auto-select first item if available
      if (selectedType === 'stocktake' && stocktakesList.length > 0) {
        setSelectedId(stocktakesList[0].id);
      } else if (selectedType === 'period' && periodsList.length > 0) {
        setSelectedId(periodsList[0].id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load stocktakes and periods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedId('');
    
    // Auto-select first item of new type
    if (type === 'stocktake' && stocktakes.length > 0) {
      setSelectedId(stocktakes[0].id);
    } else if (type === 'period' && periods.length > 0) {
      setSelectedId(periods[0].id);
    }
  };

  const handleDownload = async () => {
    if (!selectedId) {
      setError('Please select an item to download');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      // Fetch the stocktake/period data with lines
      const endpoint = selectedType === 'stocktake' 
        ? `/stock_tracker/${hotelSlug}/stocktakes/${selectedId}/`
        : `/stock_tracker/${hotelSlug}/periods/${selectedId}/`;

      console.log('Fetching data from:', endpoint);
      const response = await api.get(endpoint);
      const data = response.data;

      console.log('Data received:', data);

      // Get lines
      const linesEndpoint = selectedType === 'stocktake'
        ? `/stock_tracker/${hotelSlug}/stocktake-lines/?stocktake=${selectedId}`
        : `/stock_tracker/${hotelSlug}/period-lines/?period=${selectedId}`;
      
      const linesResponse = await api.get(linesEndpoint);
      const lines = linesResponse.data.results || linesResponse.data || [];

      console.log('Lines received:', lines.length);

      const itemName = data.name || `${selectedType}_${selectedId}`;

      // Generate PDF
      await generatePDF(data, lines, itemName);

      // Close modal after successful download
      setTimeout(() => {
        onHide();
      }, 500);
    } catch (err) {
      console.error('Download error:', err);
      setError(`Failed to download file: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const generatePDF = async (data, lines, filename) => {
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
    pdf.text(`${selectedType === 'stocktake' ? 'Stocktake' : 'Period'} Report`, 14, 20);
    
    // Add metadata
    pdf.setFontSize(10);
    pdf.text(`Name: ${data.name || 'N/A'}`, 14, 30);
    pdf.text(`Date: ${reportDate.toLocaleDateString()}`, 14, 36);
    pdf.text(`Status: ${data.is_closed ? 'Closed' : 'Open'}`, 14, 42);
    if (data.end_date) {
      pdf.text(`End Date: ${new Date(data.end_date).toLocaleDateString()}`, 100, 36);
    }

    // Group lines by category
    const groupedLines = lines.reduce((acc, line) => {
      const cat = line.category_name || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(line);
      return acc;
    }, {});

    let currentY = 50;

    // Process each category
    for (const [category, categoryLines] of Object.entries(groupedLines)) {
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

      // Prepare table data - safely parse all numeric values
      const tableData = categoryLines.map(line => {
        const safeNumber = (value) => {
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        };

        return [
          line.item_name || 'Unknown',
          safeNumber(line.opening_stock).toFixed(2),
          safeNumber(line.purchases).toFixed(2),
          safeNumber(line.waste).toFixed(2),
          safeNumber(line.counted_qty).toFixed(2),
          safeNumber(line.expected_qty).toFixed(2),
          safeNumber(line.variance).toFixed(2),
          `£${safeNumber(line.variance_value).toFixed(2)}`
        ];
      });

      // Add table using autoTable
      autoTable(pdf, {
        startY: currentY,
        head: [['Item', 'Opening', 'Purchases', 'Waste', 'Counted', 'Expected', 'Variance', 'Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 20, halign: 'right' },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 25, halign: 'right' }
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

    const totalVarianceValue = lines.reduce((sum, line) => 
      sum + (parseFloat(line.variance_value) || 0), 0
    );

    pdf.text(`Total Items: ${lines.length}`, 14, currentY);
    currentY += 6;
    pdf.text(`Total Variance Value: £${totalVarianceValue.toFixed(2)}`, 14, currentY);
    currentY += 10;

    // Add Category Breakdown section
    pdf.setFont(undefined, 'bold');
    pdf.text('Category Breakdown', 14, currentY);
    currentY += 7;
    pdf.setFont(undefined, 'normal');

    // Calculate category totals
    const categoryBreakdown = Object.entries(groupedLines).map(([category, categoryLines]) => {
      const categoryVariance = categoryLines.reduce((sum, line) => 
        sum + (parseFloat(line.variance_value) || 0), 0
      );
      return [
        category,
        categoryLines.length.toString(),
        `£${categoryVariance.toFixed(2)}`
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
      head: [['Category', 'Items', 'Variance Value']],
      body: categoryBreakdown,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
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
      setSelectedId('');
      setError(null);
      onHide();
    }
  };

  const currentList = selectedType === 'stocktake' ? stocktakes : periods;

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
          Download Stocktake Data
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
            {/* Type Selection */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Select Data Type</Form.Label>
              <div className="d-flex gap-3">
                <Button
                  variant={selectedType === 'stocktake' ? 'primary' : 'outline-primary'}
                  className="flex-fill"
                  onClick={() => handleTypeChange('stocktake')}
                  disabled={downloading}
                >
                  Stocktakes
                  <Badge bg="secondary" className="ms-2">{stocktakes.length}</Badge>
                </Button>
                <Button
                  variant={selectedType === 'period' ? 'primary' : 'outline-primary'}
                  className="flex-fill"
                  onClick={() => handleTypeChange('period')}
                  disabled={downloading}
                >
                  Periods (Closed)
                  <Badge bg="secondary" className="ms-2">{periods.length}</Badge>
                </Button>
              </div>
            </Form.Group>

            {/* Item Selection */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">
                Select {selectedType === 'stocktake' ? 'Stocktake' : 'Period'}
              </Form.Label>
              {currentList.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  No {selectedType === 'stocktake' ? 'stocktakes' : 'periods'} available
                </Alert>
              ) : (
                <Form.Select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  disabled={downloading}
                  size="lg"
                >
                  <option value="">-- Select {selectedType} --</option>
                  {currentList.map(item => {
                    const itemDate = new Date(item.start_date || item.created_at);
                    const monthYear = itemDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    const status = item.is_closed ? 'Closed' : 'Open';
                    
                    return (
                      <option key={item.id} value={item.id}>
                        {monthYear} - {item.name || selectedType} ({status})
                      </option>
                    );
                  })}
                </Form.Select>
              )}
            </Form.Group>

            {/* Format Display - PDF Only */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Export Format</Form.Label>
              <div className="format-card selected" style={{ cursor: 'default', maxWidth: '300px', margin: '0 auto' }}>
                <FaFilePdf size={40} className="mb-2" style={{ color: '#DC3545' }} />
                <div className="fw-bold">PDF</div>
                <small className="text-muted">Printable format (.pdf)</small>
              </div>
            </Form.Group>

            {selectedId && (
              <Alert variant="info" className="mb-0">
                <small>
                  <strong>Ready to download PDF:</strong>{' '}
                  {(() => {
                    const selectedItem = currentList.find(item => item.id === selectedId);
                    if (!selectedItem) return 'selected item';
                    const itemDate = new Date(selectedItem.start_date || selectedItem.created_at);
                    const monthYear = itemDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    return `${monthYear} - ${selectedItem.name || selectedType}`;
                  })()}
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
          disabled={!selectedId || downloading || loading}
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

      {/* Styles */}
      <style>{`
        .format-card {
          border: 2px solid #dee2e6;
          border-radius: 12px;
          padding: 25px;
          text-align: center;
          transition: all 0.3s ease;
          background: white;
        }

        .format-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: #0d6efd;
        }

        .format-card.selected {
          border-color: #0d6efd;
          background: #e7f1ff;
          box-shadow: 0 2px 8px rgba(13, 110, 253, 0.2);
        }
      `}</style>
    </Modal>
  );
}
