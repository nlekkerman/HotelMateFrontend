// src/components/stock_tracker/downloads/CombinedDownload.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ButtonGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import api from '../../../services/api';

export default function CombinedDownload({ show, onHide, hotelSlug }) {
  const [stocktakes, setStocktakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [includeCocktails, setIncludeCocktails] = useState(true);
  const [selectedStocktake, setSelectedStocktake] = useState(null);

  useEffect(() => {
    if (show && hotelSlug) {
      fetchData();
    }
  }, [show, hotelSlug]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/stock_tracker/${hotelSlug}/stocktakes/`);
      const all = response.data.results || response.data || [];
      const approved = all.filter(st => st.status === 'APPROVED');
      approved.sort((a, b) => new Date(b.period_start || b.created_at) - new Date(a.period_start || a.created_at));
      setStocktakes(approved);
      if (approved.length > 0) setSelectedStocktake(approved[0]);
    } catch (err) {
      setError('Failed to load stocktakes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format = downloadFormat) => {
    if (!selectedStocktake) return;
    setDownloading(true);
    setError(null);
    try {
      const endpoint = format === 'pdf' 
        ? `/stock_tracker/${hotelSlug}/stocktakes/${selectedStocktake.id}/download-combined-pdf/?include_cocktails=${includeCocktails}`
        : `/stock_tracker/${hotelSlug}/stocktakes/${selectedStocktake.id}/download-combined-excel/?include_cocktails=${includeCocktails}`;
      
      const response = await api.get(endpoint, { responseType: 'blob' });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `combined_report_${selectedStocktake.id}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) filename = match[1].replace(/['"]/g, '');
      }
      
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setTimeout(() => onHide(), 500);
    } catch (err) {
      setError(`Failed to download: ${err.response?.data?.error || err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal show={show} onHide={() => !downloading && onHide()} size="lg" centered>
      <Modal.Header closeButton={!downloading}>
        <Modal.Title>
          <FileDown size={20} className="me-2" />
          Download Combined Report (Stocktake + Period)
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-3">Loading...</p>
          </div>
        ) : (
          <>
            <Alert variant="info" className="mb-4">
              <small>
                <strong>Combined Report includes:</strong>
                <br />• Stocktake Analysis (Opening, Purchases, Expected, Counted, Variance)
                <br />• Period Closing Stock (Category breakdown, Stock values)
              </small>
            </Alert>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Select Stocktake (Approved Only)</Form.Label>
              {stocktakes.length === 0 ? (
                <Alert variant="info">No approved stocktakes available for download.</Alert>
              ) : (
                <Form.Select 
                  value={selectedStocktake?.id || ''} 
                  onChange={(e) => setSelectedStocktake(stocktakes.find(st => st.id === parseInt(e.target.value)))} 
                  disabled={downloading} 
                  size="lg"
                >
                  <option value="">-- Select Stocktake --</option>
                  {stocktakes.map(st => (
                    <option key={st.id} value={st.id}>
                      Stocktake #{st.id} - {new Date(st.period_start).toLocaleDateString()} to {new Date(st.period_end).toLocaleDateString()}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>

            {selectedStocktake && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Download Format</Form.Label>
                  <ButtonGroup className="d-flex">
                    <Button 
                      variant={downloadFormat === 'pdf' ? 'primary' : 'outline-primary'} 
                      onClick={() => setDownloadFormat('pdf')} 
                      disabled={downloading}
                    >
                      <FileDown size={16} className="me-2" />
                      PDF Report
                    </Button>
                    <Button 
                      variant={downloadFormat === 'excel' ? 'primary' : 'outline-primary'} 
                      onClick={() => setDownloadFormat('excel')} 
                      disabled={downloading}
                    >
                      <FileSpreadsheet size={16} className="me-2" />
                      Excel Workbook
                    </Button>
                  </ButtonGroup>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Check 
                    type="checkbox" 
                    checked={includeCocktails} 
                    onChange={(e) => setIncludeCocktails(e.target.checked)} 
                    label="Include cocktail sales data in period section" 
                    disabled={downloading} 
                  />
                </Form.Group>

                <Alert variant="success">
                  <small>
                    <strong>Ready:</strong> Stocktake #{selectedStocktake.id} + Matching Period
                    <br />
                    <strong>Format:</strong> {downloadFormat.toUpperCase()}
                    <br />
                    <strong>Cocktails:</strong> {includeCocktails ? 'Included' : 'Excluded'}
                  </small>
                </Alert>
              </>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onHide()} disabled={downloading}>
          <FaTimes className="me-2" />
          Cancel
        </Button>
        <Button variant="success" onClick={() => handleDownload()} disabled={!selectedStocktake || downloading}>
          {downloading ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Downloading...
            </>
          ) : (
            <>
              {downloadFormat === 'pdf' ? (
                <FileDown size={16} className="me-2" />
              ) : (
                <FileSpreadsheet size={16} className="me-2" />
              )}
              Download Combined Report
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
