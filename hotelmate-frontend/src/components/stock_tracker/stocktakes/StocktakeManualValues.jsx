import React, { useState } from 'react';
import { Form, Button, Badge, Row, Col } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';
import api from '@/services/api';

/**
 * StocktakeManualValues Component
 * Displays and saves manual financial values for the entire stocktake
 */
export const StocktakeManualValues = ({ stocktakeId, hotelSlug, stocktake }) => {
  const [manualPurchases, setManualPurchases] = useState(stocktake?.manual_purchases_value || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('💰 Saving stocktake manual values:', { stocktakeId, manualPurchases });
      await api.patch(`/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/`, {
        manual_purchases_value: manualPurchases ? parseFloat(manualPurchases) : null
      });
      console.log('✅ Stocktake manual values saved');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('❌ Failed to save stocktake manual values:', err);
      setError(err.response?.data?.detail || 'Failed to save manual values');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-muted mb-3">
        Enter manual financial values for the <strong>entire stocktake</strong> across all categories. 
        These values will be used for overall financial reporting.
      </p>

      <Row className="g-3">
        {/* Manual Purchases Value */}
        <Col md={12}>
          <Form.Group>
            <Form.Label className="fw-semibold">
              Total Purchases Value (€)
              {manualPurchases && (
                <Badge bg="success" className="ms-2">Active</Badge>
              )}
            </Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={manualPurchases}
              onChange={(e) => setManualPurchases(e.target.value)}
              placeholder="Enter total purchase cost for entire stocktake"
              size="lg"
            />
            <Form.Text className="text-muted">
              Enter the total purchase cost for all items in this stocktake period
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      {/* Save Button */}
      <div className="d-flex justify-content-end mt-3 gap-2">
        {error && (
          <div className="text-danger me-auto">
            <small>{error}</small>
          </div>
        )}
        {success && (
          <div className="text-success me-auto">
            <small><FaCheck className="me-1" />Saved successfully!</small>
          </div>
        )}
        <Button
          variant="success"
          onClick={handleSave}
          disabled={saving}
        >
          <FaCheck className="me-1" />
          {saving ? 'Saving...' : 'Save Stocktake Manual Values'}
        </Button>
        <Button
          variant="outline-secondary"
          onClick={() => {
            setManualPurchases('');
          }}
          disabled={saving}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};
