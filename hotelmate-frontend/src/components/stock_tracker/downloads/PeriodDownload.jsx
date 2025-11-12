// src/components/stock_tracker/downloads/PeriodDownload.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ButtonGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import api from '../../../services/api';

export default function PeriodDownload({ show, onHide, hotelSlug }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [includeCocktails, setIncludeCocktails] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    if (show && hotelSlug) {
      fetchData();
    }
  }, [show, hotelSlug]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/stock_tracker/${hotelSlug}/periods/`);
      const all = response.data.results || response.data || [];
      const closed = all.filter(p => p.is_closed);
      closed.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      setPeriods(closed);
      if (closed.length > 0) setSelectedPeriod(closed[0]);
    } catch (err) {
      setError('Failed to load periods');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format = downloadFormat) => {
    if (!selectedPeriod) return;
    setDownloading(true);
    setError(null);
    try {
      const endpoint = format === 'pdf' 
        ? `/stock_tracker/${hotelSlug}/periods/${selectedPeriod.id}/download-pdf/?include_cocktails=${includeCocktails}`
        : `/stock_tracker/${hotelSlug}/periods/${selectedPeriod.id}/download-excel/?include_cocktails=${includeCocktails}`;
      const response = await api.get(endpoint, { responseType: 'blob' });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `period_${selectedPeriod.id}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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
        <Modal.Title><FileDown size={20} className="me-2" />Download Period Report</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /><p className="mt-3">Loading...</p></div>
        ) : (
          <>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">Select Period (Closed Only)</Form.Label>
              {periods.length === 0 ? (
                <Alert variant="info">No closed periods available for download.</Alert>
              ) : (
                <Form.Select value={selectedPeriod?.id || ''} onChange={(e) => setSelectedPeriod(periods.find(p => p.id === parseInt(e.target.value)))} disabled={downloading} size="lg">
                  <option value="">-- Select Period --</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.period_name || `${p.month}/${p.year}`} ({new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()})
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>
            {selectedPeriod && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Download Format</Form.Label>
                  <ButtonGroup className="d-flex">
                    <Button variant={downloadFormat === 'pdf' ? 'primary' : 'outline-primary'} onClick={() => setDownloadFormat('pdf')} disabled={downloading}>
                      <FileDown size={16} className="me-2" />PDF Report
                    </Button>
                    <Button variant={downloadFormat === 'excel' ? 'primary' : 'outline-primary'} onClick={() => setDownloadFormat('excel')} disabled={downloading}>
                      <FileSpreadsheet size={16} className="me-2" />Excel Workbook
                    </Button>
                  </ButtonGroup>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Check type="checkbox" checked={includeCocktails} onChange={(e) => setIncludeCocktails(e.target.checked)} label="Include cocktail sales data" disabled={downloading} />
                </Form.Group>
                <Alert variant="info"><small><strong>Ready:</strong> {selectedPeriod.period_name || `Period ${selectedPeriod.id}`}<br /><strong>Format:</strong> {downloadFormat.toUpperCase()}<br /><strong>Cocktails:</strong> {includeCocktails ? 'Included' : 'Excluded'}</small></Alert>
              </>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onHide()} disabled={downloading}><FaTimes className="me-2" />Cancel</Button>
        <Button variant="success" onClick={() => handleDownload()} disabled={!selectedPeriod || downloading}>
          {downloading ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Downloading...</> : <>{downloadFormat === 'pdf' ? <FileDown size={16} className="me-2" /> : <FileSpreadsheet size={16} className="me-2" />}Download</>}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
