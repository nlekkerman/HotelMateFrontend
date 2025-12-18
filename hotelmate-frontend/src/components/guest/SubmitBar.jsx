import React from 'react';
import { Button, Spinner } from 'react-bootstrap';

const SubmitBar = ({ isValid, submitting, onSubmit, themeColor }) => {
  return (
    <div className="text-center">
      <Button 
        variant="primary" 
        type="submit"
        size="lg"
        disabled={submitting || !isValid}
        onClick={onSubmit}
        style={{ backgroundColor: themeColor, borderColor: themeColor }}
        className="px-5"
      >
        {submitting && <Spinner animation="border" size="sm" className="me-2" />}
        Complete Pre-Check-in
      </Button>
      {!isValid && (
        <div className="text-muted small mt-2">
          Please complete all required fields to continue
        </div>
      )}
    </div>
  );
};

export default SubmitBar;