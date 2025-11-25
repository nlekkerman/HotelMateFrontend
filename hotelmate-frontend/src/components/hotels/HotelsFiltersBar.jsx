import React, { useState, useEffect } from 'react';
import { Form, Row, Col, InputGroup, Badge } from 'react-bootstrap';

/**
 * HotelsFiltersBar - Filter controls for hotels landing page
 * Includes search, city/country filters, hotel type, and sorting
 */
const HotelsFiltersBar = ({ filters, onChange, cities = [], countries = [], hotelTypes = [] }) => {
  const [searchInput, setSearchInput] = useState(filters.q || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.q) {
        console.log('[Filters] Search changed to:', searchInput);
        onChange({ ...filters, q: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filters.q]);

  const handleCityChange = (e) => {
    console.log('[Filters] City changed to:', e.target.value);
    // Clear other location/type filters when city is selected
    onChange({ 
      ...filters, 
      city: e.target.value,
      country: '',
      hotel_type: ''
    });
    e.target.blur(); // Close dropdown after selection
  };

  const handleCountryChange = (e) => {
    console.log('[Filters] Country changed to:', e.target.value);
    // Clear other location/type filters when country is selected
    onChange({ 
      ...filters, 
      country: e.target.value,
      city: '',
      hotel_type: ''
    });
    e.target.blur(); // Close dropdown after selection
  };

  const handleSortChange = (e) => {
    console.log('[Filters] Sort changed to:', e.target.value);
    onChange({ ...filters, sort: e.target.value });
    e.target.blur(); // Close dropdown after selection
  };

  const handleHotelTypeChange = (e) => {
    console.log('[Filters] Hotel type changed to:', e.target.value);
    // Clear location filters when hotel type is selected
    onChange({ 
      ...filters, 
      hotel_type: e.target.value,
      city: '',
      country: ''
    });
    e.target.blur(); // Close dropdown after selection
  };

  const clearFilters = () => {
    setSearchInput('');
    onChange({
      q: '',
      city: '',
      country: '',
      hotel_type: '',
      sort: 'featured',
    });
  };

  const hasActiveFilters = filters.q || filters.city || filters.country || filters.hotel_type;

  return (
    <div className="hotels-filters-bar bg-white shadow-sm rounded p-4 mb-4">
      <Row className="g-3">
        {/* Search Input */}
        <Col xs={12} md={6} lg={4}>
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by hotel name or town..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </InputGroup>
        </Col>

        {/* City Filter */}
        {cities.length > 0 && (
          <Col xs={12} sm={6} md={3} lg={2}>
            <Form.Select
              value={filters.city}
              onChange={handleCityChange}
              aria-label="Filter by city"
            >
              <option value="">All Towns</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}

        {/* Country Filter */}
        {countries.length > 1 && (
          <Col xs={12} sm={6} md={3} lg={2}>
            <Form.Select
              value={filters.country}
              onChange={handleCountryChange}
              aria-label="Filter by country"
            >
              <option value="">All Countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}

        {/* Hotel Type Filter */}
        {hotelTypes.length > 0 && (
          <Col xs={12} sm={6} md={3} lg={2}>
            <Form.Select
              value={filters.hotel_type}
              onChange={handleHotelTypeChange}
              aria-label="Filter by hotel type"
            >
              <option value="">All Types</option>
              {hotelTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/([A-Z])/g, ' $1').trim()}
                </option>
              ))}
            </Form.Select>
          </Col>
        )}

        {/* Sort Dropdown */}
        <Col xs={12} sm={6} md={3} lg={2}>
          <Form.Select
            value={filters.sort}
            onChange={handleSortChange}
            aria-label="Sort hotels"
          >
            <option value="featured">Featured</option>
            <option value="name_asc">Name A–Z</option>
          </Form.Select>
        </Col>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Col xs={12} sm={6} md={3} lg={2}>
            <button
              className="btn btn-outline-secondary w-100"
              onClick={clearFilters}
            >
              <i className="bi bi-x-circle me-1"></i>
              Clear Filters
            </button>
          </Col>
        )}
      </Row>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <Row className="mt-3">
          <Col>
            <small className="text-muted">
              <i className="bi bi-funnel-fill me-1"></i>
              Active filters: 
              {filters.q && <span className="ms-1 badge bg-secondary">Search: "{filters.q}"</span>}
              {filters.city && <span className="ms-1 badge bg-secondary">City: {filters.city}</span>}
              {filters.country && <span className="ms-1 badge bg-secondary">Country: {filters.country}</span>}
              {filters.hotel_type && <span className="ms-1 badge bg-secondary">{filters.hotel_type.replace(/([A-Z])/g, ' $1').trim()}</span>}
            </small>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default HotelsFiltersBar;
