import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Card } from 'react-bootstrap';
import { FaCheckCircle, FaExclamationTriangle, FaMoneyBillWave, FaPercentage } from 'react-icons/fa';
import api from '@/services/api';

/**
 * StocktakeCloseModal Component
 * 
 * Shows a modal form for entering manual financial values when closing/approving a stocktake.
 * This is OPTIONAL - users can leave fields empty to use auto-calculated values.
 * 
 * Workflow:
 * 1. User enters optional manual values (Total Purchases COGS, Total Sales Revenue)
 * 2. Live preview shows calculated GP% and Pour Cost%
 * 3. On submit: Updates period with manual values, then approves stocktake
 */
export const StocktakeCloseModal = ({ 
  show, 
  onHide, 
  stocktake, 
  hotelSlug,
  onSuccess 
}) => {
  const [manualPurchases, setManualPurchases] = useState('');
  const [manualSales, setManualSales] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (show) {
      setManualPurchases('');
      setManualSales('');
      setNotes('');
      setError(null);
      setValidationError(null);
    }
  }, [show]);

  // Calculate preview metrics
  const calculatePreview = () => {
    const purchases = parseFloat(manualPurchases) || 0;
    const sales = parseFloat(manualSales) || 0;

    if (sales === 0) {
      return { grossProfit: 0, grossProfitPercent: 0, pourCost: 0 };
    }

    const grossProfit = sales - purchases;
    const grossProfitPercent = (grossProfit / sales) * 100;
    const pourCost = (purchases / sales) * 100;

    return {
      grossProfit: grossProfit.toFixed(2),
      grossProfitPercent: grossProfitPercent.toFixed(2),
      pourCost: pourCost.toFixed(2)
    };
  };

  // Validate inputs
  const validateInputs = () => {
    // Both fields are optional
    if (!manualPurchases && !manualSales) {
      return true; // Empty is valid - will use auto-calculated values
    }

    // If provided, must be positive numbers
    if (manualPurchases && parseFloat(manualPurchases) < 0) {
      setValidationError('Total Purchases must be a positive number');
      return false;
    }

    if (manualSales && parseFloat(manualSales) < 0) {
      setValidationError('Total Sales must be a positive number');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) {
      return;
    }

    console.log('\n🔐 ========================================');
    console.log('🔐 APPROVE & CLOSE PERIOD - Starting');
    console.log('🔐 ========================================');
    console.log('📋 Stocktake:', {
      id: stocktake.id,
      period_start: stocktake.period_start,
      period_end: stocktake.period_end,
      status: stocktake.status
    });

    setSaving(true);
    setError(null);

    try {
      // Step 1: Find the period for this stocktake
      console.log('\n📅 STEP 1: Finding matching period');
      console.log('─────────────────────────────────────────');
      
      const periodsResponse = await api.get(`/stock_tracker/${hotelSlug}/periods/`);
      const periods = periodsResponse.data.results || periodsResponse.data;
      
      console.log('📊 Found', periods.length, 'total periods');
      
      // Find period matching stocktake dates
      const period = periods.find(p => 
        p.start_date === stocktake.period_start && 
        p.end_date === stocktake.period_end
      );

      if (!period) {
        console.error('❌ No matching period found for stocktake dates:', {
          stocktake_start: stocktake.period_start,
          stocktake_end: stocktake.period_end
        });
        throw new Error('Could not find matching period for this stocktake');
      }

      console.log('✅ Found matching period:', {
        id: period.id,
        name: period.period_name,
        is_closed: period.is_closed,
        has_stocktake: !!period.stocktake_id
      });

      // Step 2: Update period with manual values (if provided)
      if (manualPurchases || manualSales) {
        console.log('\n💰 STEP 2: Updating period with manual financial values');
        console.log('─────────────────────────────────────────');
        
        const periodPayload = {};
        
        if (manualPurchases) {
          periodPayload.manual_purchases_amount = parseFloat(manualPurchases).toFixed(2);
          console.log('   💸 Manual Purchases (COGS):', periodPayload.manual_purchases_amount);
        }
        
        if (manualSales) {
          periodPayload.manual_sales_amount = parseFloat(manualSales).toFixed(2);
          console.log('   💵 Manual Sales Revenue:', periodPayload.manual_sales_amount);
        }

        console.log('� PATCH /periods/' + period.id + '/', periodPayload);
        
        await api.patch(
          `/stock_tracker/${hotelSlug}/periods/${period.id}/`,
          periodPayload
        );

        console.log('✅ Period updated with manual values');
      } else {
        console.log('\n⏭️ STEP 2: Skipping manual values (none provided)');
        console.log('   → Will use auto-calculated values from item data');
      }

      // Step 3: Use combined approve-and-close endpoint
      console.log('\n🔒 STEP 3: Approve Stocktake & Close Period (Combined)');
      console.log('─────────────────────────────────────────');
      console.log('📤 POST /periods/' + period.id + '/approve-and-close/');
      console.log('   This endpoint will:');
      console.log('   1. Change stocktake status: DRAFT → APPROVED');
      console.log('   2. Lock the stocktake (no more edits)');
      console.log('   3. Create stock adjustments for variances');
      console.log('   4. Close the period: OPEN → CLOSED');
      console.log('   5. Create StockSnapshot records (closing stock)');
      
      const payload = notes ? { notes } : {};
      
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/periods/${period.id}/approve-and-close/`,
        payload
      );

      console.log('\n✅ ========================================');
      console.log('✅ APPROVE & CLOSE COMPLETE');
      console.log('✅ ========================================');
      console.log('📊 Response:', {
        period: response.data.period,
        stocktake_updated: response.data.stocktake_updated,
        adjustments_created: response.data.adjustments_created
      });
      
      console.log('\n📸 What happens next:');
      console.log('   → Stocktake is now APPROVED and locked');
      console.log('   → Period is now CLOSED');
      console.log('   → Stock snapshots created (closing balances)');
      console.log('   → These closing balances become opening for next period!');

      // Step 4: Notify parent component of success
      if (onSuccess) {
        onSuccess();
      }

      onHide();

    } catch (err) {
      console.error('\n❌ ========================================');
      console.error('❌ ERROR IN APPROVE & CLOSE');
      console.error('❌ ========================================');
      console.error('Error:', err);
      console.error('Response:', err.response?.data);
      
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to approve and close';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const preview = calculatePreview();
  const hasValues = manualPurchases || manualSales;

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaCheckCircle className="me-2 text-success" />
          Approve & Close Period - Stocktake #{stocktake?.id}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Warning Message */}
        <Alert variant="warning">
          <FaExclamationTriangle className="me-2" />
          <strong>Important:</strong> This action will perform the following steps in order:
          <ul className="mb-0 mt-2">
            <li><strong>Step 1:</strong> Approve the stocktake (status: DRAFT → APPROVED)</li>
            <li><strong>Step 2:</strong> Close the period (status: OPEN → CLOSED)</li>
            <li>Lock the stocktake - no further edits allowed</li>
            <li>Create stock adjustments for all variances</li>
            <li>Update current stock levels in the system</li>
          </ul>
        </Alert>

        {/* Manual Values Section */}
        <Card className="mb-3 border-info">
          <Card.Header className="bg-info bg-opacity-10">
            <h6 className="mb-0">
              <FaMoneyBillWave className="me-2" />
              Optional: Period Financial Totals
            </h6>
          </Card.Header>
          <Card.Body>
            <p className="text-muted small mb-3">
              These fields are <strong>optional</strong>. Enter manual totals for this period if you have them. 
              Leave empty to use automatically calculated values from item-by-item data.
            </p>

            <Row className="g-3">
              {/* Total Purchases (COGS) */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total Purchases (COGS) €
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualPurchases}
                    onChange={(e) => setManualPurchases(e.target.value)}
                    placeholder="e.g., 19000.00"
                    disabled={saving}
                  />
                  <Form.Text className="text-muted">
                    Total cost of all purchases for this period
                  </Form.Text>
                </Form.Group>
              </Col>

              {/* Total Sales Revenue */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total Sales Revenue €
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualSales}
                    onChange={(e) => setManualSales(e.target.value)}
                    placeholder="e.g., 62000.00"
                    disabled={saving}
                  />
                  <Form.Text className="text-muted">
                    Total sales revenue for this period
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Live Preview */}
            {hasValues && manualSales > 0 && (
              <Card className="mt-3 border-success bg-light">
                <Card.Body>
                  <h6 className="text-success mb-3">
                    <FaPercentage className="me-2" />
                    Preview Calculations
                  </h6>
                  <Row>
                    <Col md={4}>
                      <div className="text-center">
                        <small className="text-muted d-block">Gross Profit</small>
                        <strong className="fs-5 text-success">€{preview.grossProfit}</strong>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-center">
                        <small className="text-muted d-block">Gross Profit %</small>
                        <strong className="fs-5 text-primary">{preview.grossProfitPercent}%</strong>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="text-center">
                        <small className="text-muted d-block">Pour Cost %</small>
                        <strong className="fs-5 text-warning">{preview.pourCost}%</strong>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
          </Card.Body>
        </Card>

        {/* Optional Notes */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Notes (Optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this stocktake closure..."
            disabled={saving}
          />
        </Form.Group>

        {/* Validation Error */}
        {validationError && (
          <Alert variant="danger" className="mb-0">
            {validationError}
          </Alert>
        )}

        {/* API Error */}
        {error && (
          <Alert variant="danger" className="mb-0">
            <strong>Error:</strong> {error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button 
          variant="success" 
          onClick={handleSubmit} 
          disabled={saving}
        >
          <FaCheckCircle className="me-2" />
          {saving ? 'Approving & Closing...' : 'Yes, Approve & Close Period'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
