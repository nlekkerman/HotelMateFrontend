import React, { useState } from 'react';
import { Badge, Form, Button, Collapse } from 'react-bootstrap';
import { FaCheck, FaChevronDown, FaChevronUp } from 'react-icons/fa';

/**
 * CategoryTotalsRow Component
 * Displays category-level totals with collapsible manual financial input fields
 */
export const CategoryTotalsRow = ({ categoryCode, categoryName, totals, isLocked, onSaveManualValues }) => {
  const [manualPurchases, setManualPurchases] = useState(totals?.manual_purchases_value || '');
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!totals) {
    return null;
  }

  // Format numbers for display
  const formatQty = (value) => parseFloat(value || 0).toFixed(2);
  const formatValue = (value) => parseFloat(value || 0).toFixed(2);

  // Handle save manual values
  const handleSave = async () => {
    if (!onSaveManualValues) return;
    
    setSaving(true);
    try {
      await onSaveManualValues(categoryCode, {
        manual_purchases_value: manualPurchases ? parseFloat(manualPurchases) : null
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Determine if variance is significant (over €50 or 5% of expected)
  const varianceValue = parseFloat(totals.variance_value || 0);
  const expectedValue = parseFloat(totals.expected_value || 0);
  const variancePercent = expectedValue !== 0 ? (Math.abs(varianceValue) / expectedValue) * 100 : 0;
  const isSignificantVariance = Math.abs(varianceValue) > 50 || variancePercent > 5;
  
  // Determine badge colors based on variance
  const getVarianceBadgeColor = () => {
    if (varianceValue < -0.01) return 'danger';
    if (varianceValue > 0.01) return 'success';
    return 'secondary';
  };

  return (
    <>
      {/* Category Totals Summary Row */}
      <tr className="table-info fw-bold">
        <td colSpan="5" className="text-end">
          <strong>{categoryName} Category Totals:</strong>
        </td>
        <td className="text-center">
          <Badge bg="info" className="px-3">
            {totals.item_count} Items
          </Badge>
        </td>
        <td colSpan="5"></td>
        <td className="text-end bg-warning-subtle">
          <div className="d-flex flex-column gap-1">
            <small className="text-muted">Expected Total:</small>
            <strong>{formatQty(totals.expected_qty)} servings</strong>
            <small className="text-success">€{formatValue(totals.expected_value)}</small>
          </div>
        </td>
        <td colSpan="5"></td>
        <td className="text-end">
          <div className="d-flex flex-column gap-1">
            <Badge bg={getVarianceBadgeColor()} className="mb-1">
              {varianceValue > 0 ? '+' : ''}{formatQty(totals.variance_qty)} servings
            </Badge>
            <Badge bg={getVarianceBadgeColor()}>
              {varianceValue >= 0 ? '+' : '-'}€{Math.abs(varianceValue).toFixed(2)}
              {isSignificantVariance && ' ⚠️'}
            </Badge>
            {variancePercent > 0 && (
              <small className="text-muted">
                ({variancePercent.toFixed(1)}%)
              </small>
            )}
          </div>
        </td>
        {!isLocked && <td></td>}
      </tr>

      {/* Toggle Button Row */}
      {!isLocked && (
        <tr>
          <td colSpan={17} className="p-1 text-center bg-light border-0">
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <FaChevronUp className="me-1" /> : <FaChevronDown className="me-1" />}
              {isExpanded ? 'Hide' : 'Add'} Manual Financial Values
              {manualPurchases && (
                <Badge bg="success" className="ms-2">Data Present</Badge>
              )}
            </Button>
          </td>
        </tr>
      )}

      {/* Manual Financial Values Row (Collapsible) */}
      <tr className="table-light">
        <td colSpan={!isLocked ? 17 : 16} className="p-0">
          <Collapse in={isExpanded}>
            <div className="p-3 bg-white rounded border">
              <h6 className="text-secondary mb-3">
                <Badge bg="secondary" className="me-2">{categoryCode}</Badge>
                {categoryName} - Manual Financial Values
              </h6>
              
              <div className="row g-3">
              {/* Manual Purchases Value */}
              <div className="col-md-12">
                <Form.Group>
                  <Form.Label className="small fw-semibold">
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
                    placeholder="Enter total purchase cost for this category"
                    disabled={isLocked}
                  />
                  <Form.Text className="text-muted">
                    Enter the total purchase cost for all items in this category during the period
                  </Form.Text>
                </Form.Group>
              </div>
            </div>

            {/* Save Button */}
            {!isLocked && (
              <div className="d-flex justify-content-end mt-3 gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <FaCheck className="me-1" />
                  {saving ? 'Saving...' : 'Save Category Manual Values'}
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setManualPurchases('');
                  }}
                  disabled={saving}
                >
                  Clear
                </Button>
              </div>
            )}
            </div>
          </Collapse>
        </td>
      </tr>
    </>
  );
};
