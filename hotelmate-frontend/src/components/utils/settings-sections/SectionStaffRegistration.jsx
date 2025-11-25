import React, { useState } from 'react';
import { Card, Button, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';

export default function SectionStaffRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [requireBoth, setRequireBoth] = useState(true);
  const [hasExpiration, setHasExpiration] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hotel-porter-d25ad83b12cf.herokuapp.com/api';

  const getAuthHeaders = () => {
    const storedUser = localStorage.getItem('user');
    const userData = storedUser ? JSON.parse(storedUser) : null;
    const token = userData?.token;
    const hotelSlug = userData?.hotel_slug;

    return {
      'Authorization': token ? `Token ${token}` : '',
      'Content-Type': 'application/json',
      'X-Hotel-Slug': hotelSlug || '',
    };
  };

  const generatePackage = async () => {
    setLoading(true);
    setError(null);

    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;
      const hotelSlug = userData?.hotel_slug;

      if (!hotelSlug) {
        throw new Error('Hotel slug not found. Please log in again.');
      }

      const response = await axios.post(
        `${API_BASE_URL}/staff/registration-package/`,
        { hotel_slug: hotelSlug },
        { headers: getAuthHeaders() }
      );

      setCurrentPackage(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate package';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!currentPackage) return;
    const link = document.createElement('a');
    link.href = currentPackage.qr_code_url;
    link.download = `registration-qr-${currentPackage.registration_code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCode = () => {
    if (!currentPackage) return;
    navigator.clipboard.writeText(currentPackage.registration_code).then(() => {
      alert('Registration code copied to clipboard!');
    });
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-qr-code me-2"></i>
          Staff Registration Packages
        </h4>
        <p className="text-muted mb-3">
          Generate secure registration codes for new staff members
        </p>
        
        <hr className="my-3" />

        {error && (
          <div className="alert alert-danger mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Options */}
        <div className="mb-4 p-3 bg-light rounded">
          <h6 className="mb-3">Package Options</h6>
          <Form.Check
            type="checkbox"
            id="require-both"
            label="Require both QR code and manual code"
            checked={requireBoth}
            onChange={(e) => setRequireBoth(e.target.checked)}
            className="mb-2"
          />
          <Form.Check
            type="checkbox"
            id="has-expiration"
            label="Set expiration date"
            checked={hasExpiration}
            onChange={(e) => setHasExpiration(e.target.checked)}
          />
        </div>

        {/* Generate Button */}
        <div className="text-center mb-4">
          <Button
            variant="primary"
            size="lg"
            onClick={generatePackage}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Generating...
              </>
            ) : (
              <>
                <i className="bi bi-plus-circle me-2"></i>
                Generate Package
              </>
            )}
          </Button>
        </div>

        {/* Current Package Display */}
        {currentPackage && (
          <div className="border rounded p-4 bg-success bg-opacity-10">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h5 className="mb-0">
                <i className="bi bi-check-circle text-success me-2"></i>
                Package Generated
              </h5>
              <span className="badge bg-success">Active</span>
            </div>

            <div className="row g-3">
              <div className="col-md-6 text-center">
                <label className="fw-bold small text-muted mb-2 d-block">QR CODE</label>
                <img
                  src={currentPackage.qr_code_url}
                  alt="Registration QR"
                  className="img-fluid border rounded p-2 bg-white"
                  style={{ maxWidth: '200px' }}
                />
              </div>

              <div className="col-md-6">
                <label className="fw-bold small text-muted mb-2 d-block">MANUAL CODE</label>
                <InputGroup className="mb-3">
                  <Form.Control
                    type="text"
                    value={currentPackage.registration_code}
                    readOnly
                    className="font-monospace fs-5 text-center fw-bold"
                  />
                  <Button variant="outline-secondary" onClick={copyCode}>
                    <i className="bi bi-clipboard"></i>
                  </Button>
                </InputGroup>

                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={downloadQRCode}>
                    <i className="bi bi-download me-2"></i>
                    Download QR Code
                  </Button>
                  <Button variant="outline-primary" onClick={copyCode}>
                    <i className="bi bi-clipboard me-2"></i>
                    Copy Code
                  </Button>
                </div>
              </div>
            </div>

            <div className="alert alert-info mt-3 mb-0">
              <small>
                <i className="bi bi-info-circle me-1"></i>
                <strong>Instructions:</strong> Print this package and give it to the new employee. 
                They need to scan the QR code and enter the registration code to complete registration.
              </small>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
