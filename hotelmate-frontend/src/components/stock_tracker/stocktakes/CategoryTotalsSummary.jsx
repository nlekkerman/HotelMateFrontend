import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { useStocktakes } from '../hooks/useStocktakes';

export const CategoryTotalsSummary = ({ stocktakeId, hotelSlug }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getCategoryTotals } = useStocktakes(hotelSlug);
  
  useEffect(() => {
    const loadTotals = async () => {
      try {
        setLoading(true);
        const data = await getCategoryTotals(stocktakeId);
        // API returns full summary object - NO FRONTEND CALCULATIONS!
        setSummary(data);
        setError(null);
      } catch (err) {
        console.error('Error loading period summary:', err);
        setError(err.message || 'Failed to load period summary');
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (stocktakeId) {
      loadTotals();
    }
  }, [stocktakeId]);

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" />
          <span className="ms-2">Loading category totals...</span>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" className="mb-4">
        {error}
      </Alert>
    );
  }

  if (!summary || !summary.categories || summary.categories.length === 0) return null;

  // NO CALCULATIONS! Just display backend-calculated values
  const categories = summary.categories;

  return (
    <Card className="mb-4">
      <Card.Header className="bg-info text-white">
        <h5 className="mb-0">
          {summary.period_name || 'Period Summary'}
        </h5>
      </Card.Header>
      <Card.Body className="p-0">
        <Table hover size="sm" className="mb-0">
          <thead className="table-light">
            <tr>
              <th>Category</th>
              <th className="text-end">Stock Value</th>
              <th className="text-end">Sales Value</th>
              <th className="text-end">Items</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.category_code}>
                <td>
                  <Badge bg="secondary" className="me-2">{cat.category_code}</Badge>
                  <strong>{cat.category_name}</strong>
                </td>
                <td className="text-end">
                  <strong className="text-primary">€{parseFloat(cat.stock_value || 0).toFixed(2)}</strong>
                </td>
                <td className="text-end">
                  <strong className="text-success">€{parseFloat(cat.sales_value || 0).toFixed(2)}</strong>
                </td>
                <td className="text-end">
                  <Badge bg="secondary">{cat.item_count}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="table-light">
            <tr className="fw-bold">
              <td>TOTAL</td>
              <td className="text-end">
                <strong className="text-primary">€{parseFloat(summary.total_stock_value || 0).toFixed(2)}</strong>
              </td>
              <td className="text-end">
                <strong className="text-success">€{parseFloat(summary.total_sales_value || 0).toFixed(2)}</strong>
              </td>
              <td className="text-end">
                <Badge bg="primary">{summary.total_items || 0}</Badge>
              </td>
            </tr>
          </tfoot>
        </Table>
      </Card.Body>
    </Card>
  );
};
