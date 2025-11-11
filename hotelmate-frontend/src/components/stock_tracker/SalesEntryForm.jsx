// src/components/stock_tracker/SalesEntryForm.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaPlus, FaTrash, FaSave, FaUndo } from 'react-icons/fa';
import { bulkCreateSales } from '@/services/stockAnalytics';
import api from '@/services/api';

/**
 * SalesEntryForm Component
 * 
 * Bulk entry form for creating multiple sales records
 * Auto-populates prices from stock items
 */
const SalesEntryForm = ({ hotelSlug, stocktakeId, periodId, onSalesCreated }) => {
  const [stockItems, setStockItems] = useState([]);
  const [salesEntries, setSalesEntries] = useState([
    { item: '', quantity: '', sale_date: new Date().toISOString().split('T')[0], _temp_id: Date.now() }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Category definitions for filtering
  const categories = {
    'D': 'Draught',
    'B': 'Bottled',
    'S': 'Spirits',
    'W': 'Wine',
    'M': 'Miscellaneous'
  };

  // Fetch stock items on mount
  useEffect(() => {
    fetchStockItems();
  }, [hotelSlug]);

  const fetchStockItems = async () => {
    try {
      setLoadingItems(true);
      const response = await api.get(`/stock_tracker/${hotelSlug}/items/`);
      const items = response.data.results || response.data;
      
      // Sort by name for easier selection
      const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));
      setStockItems(sortedItems);
    } catch (err) {
      console.error('Failed to fetch stock items:', err);
      setError('Failed to load stock items. Please refresh the page.');
    } finally {
      setLoadingItems(false);
    }
  };

  // Filter items by category
  const filteredItems = selectedCategory === 'all' 
    ? stockItems 
    : stockItems.filter(item => item.category === selectedCategory);

  // Add new row
  const addRow = () => {
    setSalesEntries([
      ...salesEntries,
      { 
        item: '', 
        quantity: '', 
        sale_date: new Date().toISOString().split('T')[0],
        _temp_id: Date.now() + Math.random() // Unique ID for React key
      }
    ]);
  };

  // Remove row
  const removeRow = (tempId) => {
    if (salesEntries.length === 1) {
      // Keep at least one row, just reset it
      setSalesEntries([
        { item: '', quantity: '', sale_date: new Date().toISOString().split('T')[0], _temp_id: Date.now() }
      ]);
    } else {
      setSalesEntries(salesEntries.filter(entry => entry._temp_id !== tempId));
    }
  };

  // Update row
  const updateRow = (tempId, field, value) => {
    setSalesEntries(salesEntries.map(entry => 
      entry._temp_id === tempId 
        ? { ...entry, [field]: value }
        : entry
    ));
  };

  // Get item details
  const getItemDetails = (itemId) => {
    return stockItems.find(item => item.id === parseInt(itemId));
  };

  // Calculate row totals
  const calculateRowTotals = (entry) => {
    const item = getItemDetails(entry.item);
    if (!item || !entry.quantity) {
      return { revenue: 0, cost: 0, profit: 0, gp: 0 };
    }

    const quantity = parseFloat(entry.quantity);
    const revenue = quantity * parseFloat(item.menu_price || 0);
    const cost = quantity * parseFloat(item.cost_per_serving || 0);
    const profit = revenue - cost;
    const gp = revenue > 0 ? (profit / revenue * 100) : 0;

    return { revenue, cost, profit, gp };
  };

  // Calculate grand totals
  const grandTotals = salesEntries.reduce((acc, entry) => {
    const totals = calculateRowTotals(entry);
    return {
      revenue: acc.revenue + totals.revenue,
      cost: acc.cost + totals.cost,
      profit: acc.profit + totals.profit,
      quantity: acc.quantity + (entry.quantity ? parseFloat(entry.quantity) : 0)
    };
  }, { revenue: 0, cost: 0, profit: 0, quantity: 0 });

  const grandGP = grandTotals.revenue > 0 
    ? (grandTotals.profit / grandTotals.revenue * 100) 
    : 0;

  // Validate form
  const validateForm = () => {
    const validSales = salesEntries.filter(entry => entry.item && entry.quantity);
    
    if (validSales.length === 0) {
      setError('Please add at least one sale with item and quantity');
      return false;
    }

    // Check for duplicate items
    const itemIds = validSales.map(entry => entry.item);
    const uniqueItems = new Set(itemIds);
    if (itemIds.length !== uniqueItems.size) {
      setError('Warning: You have duplicate items. This will create multiple sale records for the same item.');
      // Don't return false - just warn
    }

    return true;
  };

  // Reset form
  const resetForm = () => {
    setSalesEntries([
      { item: '', quantity: '', sale_date: new Date().toISOString().split('T')[0], _temp_id: Date.now() }
    ]);
    setError(null);
    setSuccess(null);
  };

  // Submit sales
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Filter out empty rows
      const validSales = salesEntries.filter(entry => entry.item && entry.quantity);

      // Convert to API format
      const salesData = validSales.map(entry => ({
        item: parseInt(entry.item),
        quantity: parseFloat(entry.quantity),
        sale_date: entry.sale_date
        // Note: unit_cost and unit_price are AUTO-POPULATED by backend
      }));

      const result = await bulkCreateSales(hotelSlug, stocktakeId, salesData);

      setSuccess(`Successfully created ${result.created_count} sales records!`);
      
      // Reset form
      resetForm();

      // Callback to parent
      if (onSalesCreated) {
        onSalesCreated(result);
      }

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(`Failed to create sales: ${errorMessage}`);
      console.error('Failed to create sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  if (loadingItems) {
    return (
      <Card>
        <Card.Body className="text-center p-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading stock items...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="sales-entry-form">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Enter Sales Records</h5>
          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="all">All Categories</option>
              {Object.entries(categories).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </Form.Select>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="p-0">
        {/* Success Message */}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="m-3 mb-0">
            <strong>✓ {success}</strong>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="m-3 mb-0">
            <strong>⚠ {error}</strong>
          </Alert>
        )}

        {/* Entry Form */}
        <Form onSubmit={handleSubmit}>
          <div className="table-responsive">
            <Table className="mb-0" hover>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '35%' }}>Item</th>
                  <th style={{ width: '10%' }} className="text-end">Quantity</th>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '10%' }} className="text-end">Revenue</th>
                  <th style={{ width: '10%' }} className="text-end">Cost</th>
                  <th style={{ width: '10%' }} className="text-end">Profit</th>
                  <th style={{ width: '8%' }} className="text-end">GP%</th>
                  <th style={{ width: '2%' }}></th>
                </tr>
              </thead>
              <tbody>
                {salesEntries.map((entry) => {
                  const item = getItemDetails(entry.item);
                  const totals = calculateRowTotals(entry);

                  return (
                    <tr key={entry._temp_id}>
                      <td>
                        <Form.Select
                          size="sm"
                          value={entry.item}
                          onChange={(e) => updateRow(entry._temp_id, 'item', e.target.value)}
                          required
                        >
                          <option value="">Select item...</option>
                          {filteredItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} - {item.category_name} (€{parseFloat(item.menu_price || 0).toFixed(2)})
                            </option>
                          ))}
                        </Form.Select>
                        {item && (
                          <small className="text-muted d-block mt-1">
                            {item.sku} | Cost: €{parseFloat(item.cost_per_serving || 0).toFixed(2)}/serving
                          </small>
                        )}
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          size="sm"
                          value={entry.quantity}
                          onChange={(e) => updateRow(entry._temp_id, 'quantity', e.target.value)}
                          placeholder="Qty"
                          min="0"
                          step="1"
                          required
                          className="text-end"
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="date"
                          size="sm"
                          value={entry.sale_date}
                          onChange={(e) => updateRow(entry._temp_id, 'sale_date', e.target.value)}
                          required
                        />
                      </td>
                      <td className="text-end align-middle">
                        <small className={entry.item && entry.quantity ? 'text-dark' : 'text-muted'}>
                          {formatCurrency(totals.revenue)}
                        </small>
                      </td>
                      <td className="text-end align-middle">
                        <small className={entry.item && entry.quantity ? 'text-danger' : 'text-muted'}>
                          {formatCurrency(totals.cost)}
                        </small>
                      </td>
                      <td className="text-end align-middle">
                        <small className={entry.item && entry.quantity ? 'text-success fw-bold' : 'text-muted'}>
                          {formatCurrency(totals.profit)}
                        </small>
                      </td>
                      <td className="text-end align-middle">
                        {entry.item && entry.quantity && (
                          <Badge bg="success" className="small">
                            {totals.gp.toFixed(1)}%
                          </Badge>
                        )}
                      </td>
                      <td className="text-center align-middle">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => removeRow(entry._temp_id)}
                          className="text-danger p-0"
                          title="Remove row"
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="table-secondary">
                <tr>
                  <th>
                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      onClick={addRow}
                    >
                      <FaPlus className="me-1" /> Add Row
                    </Button>
                  </th>
                  <th className="text-end">{grandTotals.quantity.toFixed(0)}</th>
                  <th>TOTALS</th>
                  <th className="text-end">{formatCurrency(grandTotals.revenue)}</th>
                  <th className="text-end">{formatCurrency(grandTotals.cost)}</th>
                  <th className="text-end text-success">
                    <strong>{formatCurrency(grandTotals.profit)}</strong>
                  </th>
                  <th className="text-end">
                    <Badge bg="success">{grandGP.toFixed(1)}%</Badge>
                  </th>
                  <th></th>
                </tr>
              </tfoot>
            </Table>
          </div>

          {/* Form Actions */}
          <div className="p-3 bg-light border-top d-flex justify-content-between">
            <Button
              type="button"
              variant="outline-secondary"
              onClick={resetForm}
              disabled={loading}
            >
              <FaUndo className="me-2" />
              Reset Form
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              disabled={loading || salesEntries.every(e => !e.item || !e.quantity)}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  Save Sales ({salesEntries.filter(e => e.item && e.quantity).length})
                </>
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>

      <Card.Footer className="text-muted">
        <small>
          <strong>💡 Note:</strong> Unit costs and prices are automatically fetched from stock items. 
          You only need to select the item, enter quantity, and date. All calculations are performed automatically.
        </small>
      </Card.Footer>
    </Card>
  );
};

export default SalesEntryForm;
