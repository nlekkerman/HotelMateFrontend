import React, { useState } from 'react';
import { Card, Table, Form, Button, Badge } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';

export const StocktakeLines = ({ lines, isLocked, onUpdateLine }) => {
  const [editingLine, setEditingLine] = useState(null);
  const [fullUnits, setFullUnits] = useState('');
  const [partialUnits, setPartialUnits] = useState('');

  // Group lines by category
  const groupedLines = lines.reduce((acc, line) => {
    const cat = line.category_name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(line);
    return acc;
  }, {});

  const handleEdit = (line) => {
    setEditingLine(line.id);
    setFullUnits(line.counted_full_units || '');
    setPartialUnits(line.counted_partial_units || '');
  };

  const handleSave = (lineId) => {
    onUpdateLine(lineId, parseFloat(fullUnits) || 0, parseFloat(partialUnits) || 0);
    setEditingLine(null);
    setFullUnits('');
    setPartialUnits('');
  };

  const handleCancel = () => {
    setEditingLine(null);
    setFullUnits('');
    setPartialUnits('');
  };

  const getVarianceBadge = (variance, expectedQty) => {
    if (expectedQty === 0) return <Badge bg="secondary">N/A</Badge>;
    
    const variancePercent = Math.abs((variance / expectedQty) * 100);
    let bgColor = 'success'; // < 5%
    
    if (variancePercent >= 10) {
      bgColor = 'danger'; // > 10%
    } else if (variancePercent >= 5) {
      bgColor = 'warning'; // 5-10%
    }
    
    return (
      <Badge bg={bgColor}>
        {variance >= 0 ? '+' : ''}{variance.toFixed(2)} ({variancePercent.toFixed(1)}%)
      </Badge>
    );
  };

  return (
    <>
      {Object.entries(groupedLines).map(([categoryName, categoryLines]) => (
        <Card key={categoryName} className="mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">{categoryName}</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>SKU</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Name</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Category</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Size</th>
                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>UOM</th>
                    <th rowSpan="2" className="text-end" style={{ verticalAlign: 'middle' }}>Unit Cost</th>
                    <th rowSpan="2" className="text-end" style={{ verticalAlign: 'middle' }}>Menu Price</th>
                    <th colSpan="3" className="text-center bg-info text-white">Previously Closed Stocktake Data (Read-Only)</th>
                    <th rowSpan="2" className="text-end" style={{ verticalAlign: 'middle' }}>Counted Full</th>
                    <th rowSpan="2" className="text-end" style={{ verticalAlign: 'middle' }}>Counted Partial</th>
                    {!isLocked && <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Actions</th>}
                  </tr>
                  <tr>
                    <th className="text-end bg-info-subtle">Previously Closed Period - Full Units</th>
                    <th className="text-end bg-info-subtle">Previously Closed Period - Partial Units</th>
                    <th className="text-end bg-info-subtle">Previously Closed Period - Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryLines.map(line => {
                    // Calculate previous full and partial units from opening_qty
                    const openingQty = parseFloat(line.opening_qty || 0);
                    // UOM might be in the item object or directly on the line
                    const uom = parseFloat(line.item_uom || line.uom || 1);
                    const prevFullUnits = Math.floor(openingQty / uom);
                    const prevPartialUnits = openingQty % uom;
                    const prevTotalValue = openingQty * parseFloat(line.valuation_cost || 0);
                    
                    // Get menu price from the line data
                    const menuPrice = parseFloat(line.item_menu_price || line.menu_price || 0);
                    
                    return (
                      <tr key={line.id}>
                        <td><code className="small">{line.item_sku}</code></td>
                        <td>
                          <strong>{line.item_name}</strong>
                        </td>
                        <td>
                          <Badge bg="secondary" className="small">{categoryName}</Badge>
                        </td>
                        <td>
                          {line.item_size ? (
                            <small className="text-muted">{line.item_size}</small>
                          ) : (
                            <small className="text-muted">-</small>
                          )}
                        </td>
                        <td className="text-center">
                          <Badge bg="light" text="dark" className="small">
                            {uom.toFixed(0)}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <strong>€{parseFloat(line.valuation_cost || 0).toFixed(2)}</strong>
                        </td>
                        <td className="text-end">
                          <strong className="text-success">€{menuPrice.toFixed(2)}</strong>
                        </td>
                        {/* Previous Stocktake Section (Read-Only) */}
                        <td className="text-end bg-info-subtle">
                          <Badge bg="info" className="small">{prevFullUnits}</Badge>
                        </td>
                        <td className="text-end bg-info-subtle">
                          <small className="text-muted">{prevPartialUnits.toFixed(2)}</small>
                        </td>
                        <td className="text-end bg-info-subtle">
                          <strong className="small">€{prevTotalValue.toFixed(2)}</strong>
                        </td>
                        {/* Current Count Section */}
                        <td className="text-end">
                          {editingLine === line.id ? (
                            <Form.Control
                              type="number"
                              step="1"
                              size="sm"
                              value={fullUnits}
                              onChange={(e) => setFullUnits(e.target.value)}
                              style={{ width: '90px' }}
                              autoFocus
                            />
                          ) : (
                            line.counted_full_units !== null && line.counted_full_units !== undefined
                              ? <Badge bg="primary">{parseFloat(line.counted_full_units).toFixed(0)}</Badge>
                              : <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="text-end">
                          {editingLine === line.id ? (
                            <Form.Control
                              type="number"
                              step="0.01"
                              size="sm"
                              value={partialUnits}
                              onChange={(e) => setPartialUnits(e.target.value)}
                              style={{ width: '90px' }}
                            />
                          ) : (
                            line.counted_partial_units !== null && line.counted_partial_units !== undefined
                              ? <small>{parseFloat(line.counted_partial_units).toFixed(2)}</small>
                              : <span className="text-muted">-</span>
                          )}
                        </td>
                        {!isLocked && (
                          <td>
                            {editingLine === line.id ? (
                              <div className="btn-group btn-group-sm">
                                <Button 
                                  variant="success" 
                                  size="sm" 
                                  onClick={() => handleSave(line.id)}
                                  title="Save"
                                >
                                  <FaCheck />
                                </Button>
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  onClick={handleCancel}
                                  title="Cancel"
                                >
                                  ×
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant={line.counted_full_units === null ? "primary" : "outline-secondary"}
                                size="sm" 
                                onClick={() => handleEdit(line)}
                              >
                                {line.counted_full_units === null ? 'Count' : 'Edit'}
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      ))}
    </>
  );
};
