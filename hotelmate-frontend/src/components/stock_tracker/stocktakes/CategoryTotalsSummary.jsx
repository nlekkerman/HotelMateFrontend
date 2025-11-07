import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { useStocktakes } from '../hooks/useStocktakes';

export const CategoryTotalsSummary = ({ stocktakeId, hotelSlug }) => {
  const [totals, setTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getCategoryTotals } = useStocktakes(hotelSlug);
  
  useEffect(() => {
    const loadTotals = async () => {
      try {
        setLoading(true);
        const data = await getCategoryTotals(stocktakeId);
        setTotals(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load category totals');
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

  if (totals.length === 0) return null;

  // Calculate overall totals
  const overallExpected = totals.reduce((sum, cat) => sum + parseFloat(cat.total_expected_value || 0), 0);
  const overallCounted = totals.reduce((sum, cat) => sum + parseFloat(cat.total_counted_value || 0), 0);
  const overallVariance = overallCounted - overallExpected;
  const overallVariancePercent = overallExpected !== 0 ? (overallVariance / overallExpected) * 100 : 0;

  return (
    <Card className="mb-4">
      <Card.Header className="bg-info text-white">
        <h5 className="mb-0">Category Summary</h5>
      </Card.Header>
      <Card.Body className="p-0">
        <Table hover size="sm" className="mb-0">
          <thead className="table-light">
            <tr>
              <th>Category</th>
              <th className="text-end">Expected Value</th>
              <th className="text-end">Counted Value</th>
              <th className="text-end">Variance (€)</th>
              <th className="text-end">Variance (%)</th>
              <th className="text-end">Items</th>
            </tr>
          </thead>
          <tbody>
            {totals.map(cat => {
              const variancePercent = cat.total_expected_value !== 0 
                ? (cat.total_variance_value / cat.total_expected_value) * 100 
                : 0;
              
              return (
                <tr key={cat.category}>
                  <td>
                    <Badge bg="secondary" className="me-2">{cat.category}</Badge>
                    <strong>{cat.category_name}</strong>
                  </td>
                  <td className="text-end">€{parseFloat(cat.total_expected_value).toFixed(2)}</td>
                  <td className="text-end">€{parseFloat(cat.total_counted_value).toFixed(2)}</td>
                  <td className="text-end">
                    <Badge bg={cat.total_variance_value < 0 ? 'danger' : cat.total_variance_value > 0 ? 'success' : 'secondary'}>
                      {cat.total_variance_value >= 0 ? '+' : ''}€{parseFloat(cat.total_variance_value).toFixed(2)}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Badge bg={
                      Math.abs(variancePercent) > 10 ? 'danger' : 
                      Math.abs(variancePercent) > 5 ? 'warning' : 
                      'success'
                    }>
                      {variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Badge bg="secondary">{cat.item_count}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="table-light">
            <tr className="fw-bold">
              <td>TOTAL</td>
              <td className="text-end">€{overallExpected.toFixed(2)}</td>
              <td className="text-end">€{overallCounted.toFixed(2)}</td>
              <td className="text-end">
                <Badge bg={overallVariance < 0 ? 'danger' : overallVariance > 0 ? 'success' : 'secondary'}>
                  {overallVariance >= 0 ? '+' : ''}€{overallVariance.toFixed(2)}
                </Badge>
              </td>
              <td className="text-end">
                <Badge bg={
                  Math.abs(overallVariancePercent) > 10 ? 'danger' : 
                  Math.abs(overallVariancePercent) > 5 ? 'warning' : 
                  'success'
                }>
                  {overallVariancePercent >= 0 ? '+' : ''}{overallVariancePercent.toFixed(1)}%
                </Badge>
              </td>
              <td className="text-end">
                <Badge bg="primary">{totals.reduce((sum, cat) => sum + cat.item_count, 0)}</Badge>
              </td>
            </tr>
          </tfoot>
        </Table>
      </Card.Body>
    </Card>
  );
};
