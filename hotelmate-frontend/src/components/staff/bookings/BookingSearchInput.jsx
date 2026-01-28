import React, { useState, useCallback } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { useDebouncedCallback } from 'use-debounce';

/**
 * Search Input Component
 * Debounced search input for booking queries
 */
const BookingSearchInput = ({ value, onChange, placeholder = "Search guests, emails, booking IDs, rooms..." }) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange callback by 300ms
  const debouncedOnChange = useDebouncedCallback((searchValue) => {
    onChange(searchValue);
  }, 300);

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <InputGroup>
      <InputGroup.Text>
        <i className="bi bi-search"></i>
      </InputGroup.Text>
      <Form.Control
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleInputChange}
        className="border-start-0"
      />
      {localValue && (
        <InputGroup.Text 
          role="button" 
          onClick={handleClear}
          className="bg-light"
          style={{ cursor: 'pointer' }}
        >
          <i className="bi bi-x-circle"></i>
        </InputGroup.Text>
      )}
    </InputGroup>
  );
};

export default BookingSearchInput;