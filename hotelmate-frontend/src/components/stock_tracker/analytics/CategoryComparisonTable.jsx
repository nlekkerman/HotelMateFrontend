import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { FaArrowUp, FaArrowDown, FaEquals, FaChartBar } from 'react-icons/fa';
import { getPeriodSnapshot, getPeriodsList } from '../../../services/stockAnalytics';

/**
 * Category Comparison Table Component
 * 
 * Shows detailed comparison between two periods with value and percentage changes
 */
const CategoryComparisonTable = ({ 
  hotelSlug, 
  periods = [] // Array of period IDs
}) => {
  const [period1, setPeriod1] = useState(periods[0] || null);
  const [period2, setPeriod2] = useState(periods[1] || null);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hotelSlug) {
      fetchPeriods();
    }
  }, [hotelSlug]);

  useEffect(() => {
    // Update selected periods when periods prop changes
    if (periods.length > 0) {
      setPeriod1(periods[0]);
      if (periods.length > 1) {
        setPeriod2(periods[1]);
      }
    }
  }, [periods]);

  useEffect(() => {
    if (period1 && period2 && hotelSlug) {
      fetchComparisonData();
    }
  }, [period1, period2, hotelSlug]);

  const fetchPeriods = async () => {
    try {
      const response = await getPeriodsList(hotelSlug, true); // Get closed periods only
      setAvailablePeriods(response);
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  const getCategoryName = (categoryCode) => {
    const categoryMap = {
      'S': 'Spirits',
      'W': 'Wine',
      'B': 'Bottled Beer',
      'D': 'Draught Beer',
      'M': 'Minerals & Syrups'
    };
    return categoryMap[categoryCode] || categoryCode;
  };

  const processSnapshotsToCategories = (snapshots) => {
    const categoryMap = new Map();

    snapshots.forEach(snapshot => {
      const categoryCode = snapshot.item?.category || 'Unknown';
      const categoryName = snapshot.item?.category_name || getCategoryName(categoryCode);
      const value = parseFloat(snapshot.closing_stock_value || 0);

      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, categoryMap.get(categoryName) + value);
      } else {
        categoryMap.set(categoryName, value);
      }
    });

    return categoryMap;
  };

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [snapshot1, snapshot2] = await Promise.all([
        getPeriodSnapshot(hotelSlug, period1),
        getPeriodSnapshot(hotelSlug, period2)
      ]);

      // Process snapshots to get category breakdowns
      const categoryMap1 = processSnapshotsToCategories(snapshot1.snapshots || []);
      const categoryMap2 = processSnapshotsToCategories(snapshot2.snapshots || []);

      const total1 = Array.from(categoryMap1.values()).reduce((sum, val) => sum + val, 0);
      const total2 = Array.from(categoryMap2.values()).reduce((sum, val) => sum + val, 0);

      // Convert to breakdown arrays with percentages
      const breakdown1 = Array.from(categoryMap1.entries()).map(([category, value]) => ({
        category,
        value: Math.round(value * 100) / 100,
        percentage: total1 > 0 ? Math.round((value / total1) * 10000) / 100 : 0
      }));

      const breakdown2 = Array.from(categoryMap2.entries()).map(([category, value]) => ({
        category,
        value: Math.round(value * 100) / 100,
        percentage: total2 > 0 ? Math.round((value / total2) * 10000) / 100 : 0
      }));

      setData1({ breakdown: breakdown1, total: total1 });
      setData2({ breakdown: breakdown2, total: total2 });
    } catch (err) {
      setError(err.message || 'Failed to fetch comparison data');
    } finally {
      setLoading(false);
    }
  };

  const calculateComparison = () => {
    if (!data1 || !data2) return [];

    const categories = new Set([
      ...data1.breakdown.map(c => c.category),
      ...data2.breakdown.map(c => c.category)
    ]);

    return Array.from(categories).map(category => {
      const cat1 = data1.breakdown.find(c => c.category === category) || { value: 0, percentage: 0 };
      const cat2 = data2.breakdown.find(c => c.category === category) || { value: 0, percentage: 0 };

      const valueChange = cat2.value - cat1.value;
      const percentageChange = cat2.percentage - cat1.percentage;
      const valueChangePercent = cat1.value > 0 ? ((valueChange / cat1.value) * 100) : (cat2.value > 0 ? 100 : 0);

      return {
        category,
        period1Value: cat1.value,
        period1Percentage: cat1.percentage,
        period2Value: cat2.value,
        period2Percentage: cat2.percentage,
        valueChange: Math.round(valueChange * 100) / 100,
        percentageChange: Math.round(percentageChange * 100) / 100,
        valueChangePercent: Math.round(valueChangePercent * 100) / 100
      };
    }).sort((a, b) => Math.abs(b.valueChange) - Math.abs(a.valueChange));
  };

  const renderChangeIndicator = (change) => {
    if (Math.abs(change) < 0.01) {
      return <Badge bg="secondary" className="text-white"><FaEquals /> 0%</Badge>;
    }
    if (change > 0) {
      return <Badge bg="success" className="text-white"><FaArrowUp /> {change.toFixed(2)}%</Badge>;
    }
    return <Badge bg="danger" className="text-white"><FaArrowDown /> {change.toFixed(2)}%</Badge>;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (!periods || periods.length < 2) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-dark">
          <FaChartBar className="me-2" />
          <span>Category Comparison Table</span>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            Please select at least 2 periods to compare categories
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  const period1Name = availablePeriods.find(p => p.id === period1)?.period_name || 'Period 1';
  const period2Name = availablePeriods.find(p => p.id === period2)?.period_name || 'Period 2';
  const comparison = calculateComparison();

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-info text-dark">
        <Row className="align-items-center">
          <Col>
            <FaChartBar className="me-2" />
            <span>Category Comparison Table</span>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {/* Period Selection */}
        <Row className="mb-3">
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Period 1</Form.Label>
              <Form.Select 
                size="sm" 
                value={period1 || ''} 
                onChange={(e) => setPeriod1(parseInt(e.target.value))}
              >
                <option value="">Select Period</option>
                {availablePeriods.map((period, index) => (
                  <option key={`table-period1-${period.id}-${index}`} value={period.id}>
                    {period.period_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Period 2</Form.Label>
              <Form.Select 
                size="sm" 
                value={period2 || ''} 
                onChange={(e) => setPeriod2(parseInt(e.target.value))}
              >
                <option value="">Select Period</option>
                {availablePeriods.map((period, index) => (
                  <option key={`table-period2-${period.id}-${index}`} value={period.id}>
                    {period.period_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">Loading comparison data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="danger">{error}</Alert>
        )}

        {/* Comparison Table */}
        {!loading && !error && period1 && period2 && comparison.length > 0 && (
          <>
            <div className="table-responsive">
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th rowSpan="2" className="align-middle">Category</th>
                    <th colSpan="2" className="text-center bg-light">{period1Name}</th>
                    <th colSpan="2" className="text-center bg-light">{period2Name}</th>
                    <th colSpan="2" className="text-center bg-light">Change</th>
                  </tr>
                  <tr>
                    <th className="text-end">Value</th>
                    <th className="text-end">%</th>
                    <th className="text-end">Value</th>
                    <th className="text-end">%</th>
                    <th className="text-end">€</th>
                    <th className="text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, idx) => {
                    const isHigherInPeriod2 = row.period2Value > row.period1Value;
                    const isLowerInPeriod2 = row.period2Value < row.period1Value;
                    
                    return (
                      <tr key={idx}>
                        <td><strong>{row.category}</strong></td>
                        <td 
                          className={`text-end ${!isHigherInPeriod2 && row.period1Value > 0 ? 'bg-success bg-opacity-10' : ''}`}
                          style={!isHigherInPeriod2 && row.period1Value > 0 ? { fontWeight: 'bold' } : {}}
                        >
                          {formatCurrency(row.period1Value)}
                        </td>
                        <td className="text-end">{row.period1Percentage.toFixed(2)}%</td>
                        <td 
                          className={`text-end ${isHigherInPeriod2 ? 'bg-success bg-opacity-10' : ''}`}
                          style={isHigherInPeriod2 ? { fontWeight: 'bold' } : {}}
                        >
                          {formatCurrency(row.period2Value)}
                        </td>
                        <td className="text-end">{row.period2Percentage.toFixed(2)}%</td>
                        <td className="text-end">
                          <span className={row.valueChange > 0 ? 'text-success fw-bold' : row.valueChange < 0 ? 'text-danger fw-bold' : 'text-secondary'}>
                            {row.valueChange > 0 ? '+' : ''}{formatCurrency(row.valueChange)}
                          </span>
                        </td>
                        <td className="text-center">
                          {renderChangeIndicator(row.valueChangePercent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-primary">
                    <td><strong>Total</strong></td>
                    <td className="text-end"><strong>{formatCurrency(data1?.total || 0)}</strong></td>
                    <td className="text-end"><strong>100%</strong></td>
                    <td className="text-end"><strong>{formatCurrency(data2?.total || 0)}</strong></td>
                    <td className="text-end"><strong>100%</strong></td>
                    <td className="text-end">
                      <strong className={(data2?.total - data1?.total) > 0 ? 'text-success' : (data2?.total - data1?.total) < 0 ? 'text-danger' : 'text-secondary'}>
                        {(data2?.total - data1?.total) > 0 ? '+' : ''}{formatCurrency(data2?.total - data1?.total)}
                      </strong>
                    </td>
                    <td className="text-center">
                      <strong>
                        {renderChangeIndicator(data1?.total > 0 ? ((data2?.total - data1?.total) / data1?.total * 100) : 0)}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </div>

            {/* Summary Insights */}
            <Alert variant="light" className="mt-3">
              <strong>📊 Summary:</strong> Total stock value changed from {formatCurrency(data1?.total || 0)} to {formatCurrency(data2?.total || 0)}.
              {comparison.length > 0 && (
                <span> Largest change: <strong>{comparison[0].category}</strong> ({comparison[0].valueChange > 0 ? '+' : ''}{formatCurrency(comparison[0].valueChange)})</span>
              )}
            </Alert>
          </>
        )}

        {/* No Data State */}
        {!loading && !error && period1 && period2 && comparison.length === 0 && (
          <Alert variant="info" className="text-center">
            No category data available for the selected periods
          </Alert>
        )}

        {/* Selection Prompt */}
        {!period1 || !period2 ? (
          <Alert variant="info" className="text-center">
            Select two periods above to compare category values and percentages
          </Alert>
        ) : null}
      </Card.Body>
    </Card>
  );
};

export default CategoryComparisonTable;
