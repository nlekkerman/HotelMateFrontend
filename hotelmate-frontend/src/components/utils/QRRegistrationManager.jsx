import React, { useState, useEffect } from 'react';
import api from '@/services/api';

const QRRegistrationManager = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [packages, setPackages] = useState([]);
  const [currentPackage, setCurrentPackage] = useState(null);

  // Auth headers and base URL are now handled automatically by api.js service

  // Generate a new registration package
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

      console.log('🎫 Generating registration package for:', hotelSlug);

      const response = await api.post(
        '/staff/registration-package/',
        { hotel_slug: hotelSlug }
      );

      console.log('✅ Package generated:', response.data);
      setCurrentPackage(response.data);
      
      // Add to packages list
      setPackages(prev => [response.data, ...prev]);

    } catch (err) {
      console.error('❌ Error generating package:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate package';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Download QR code
  const downloadQRCode = (qrCodeUrl, registrationCode) => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `registration-qr-${registrationCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print package
  const printPackage = (pkg) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Staff Registration Package - ${pkg.registration_code}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              text-align: center;
            }
            .header {
              margin-bottom: 30px;
            }
            .hotel-name {
              font-size: 28px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              color: #3498db;
              margin-bottom: 30px;
            }
            .qr-code {
              margin: 30px 0;
            }
            .qr-code img {
              max-width: 300px;
              height: auto;
              border: 2px solid #ddd;
              padding: 10px;
            }
            .code-section {
              margin: 30px 0;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .code-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 10px;
            }
            .code-value {
              font-size: 32px;
              font-weight: bold;
              color: #2c3e50;
              letter-spacing: 3px;
              font-family: 'Courier New', monospace;
            }
            .instructions {
              margin-top: 40px;
              text-align: left;
              padding: 20px;
              background: #e8f4f8;
              border-radius: 8px;
            }
            .instructions h3 {
              color: #2c3e50;
              margin-bottom: 15px;
            }
            .instructions ol {
              line-height: 1.8;
            }
            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #999;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hotel-name">${pkg.hotel_name || 'HotelMates'}</div>
            <div class="title">Staff Registration Package</div>
          </div>

          <div class="qr-code">
            <p style="color: #666; margin-bottom: 15px;">Scan this QR code to start registration:</p>
            <img src="${pkg.qr_code_url}" alt="Registration QR Code" />
          </div>

          <div class="code-section">
            <div class="code-label">Your Registration Code:</div>
            <div class="code-value">${pkg.registration_code}</div>
          </div>

          <div class="instructions">
            <h3>📋 Registration Instructions</h3>
            <ol>
              <li><strong>Scan the QR code</strong> above with your phone camera</li>
              <li>Your browser will open the registration page automatically</li>
              <li><strong>Enter the registration code</strong> shown above</li>
              <li>Create your <strong>username</strong> and <strong>password</strong></li>
              <li>Submit the form and wait for manager approval</li>
            </ol>
            <p style="margin-top: 20px; color: #e74c3c; font-weight: bold;">
              ⚠️ This code can only be used once. Keep it secure until registration is complete.
            </p>
          </div>

          <div class="footer">
            Generated on: ${new Date().toLocaleString()}<br>
            Package ID: ${pkg.id || 'N/A'}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Copy code to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Registration code copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="qr-registration-manager">
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">
            <i className="fas fa-qrcode me-2"></i>
            Staff Registration Packages
          </h4>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            <strong>QR Code Registration System</strong>
            <p className="mb-0 mt-2">
              Generate secure registration packages for new staff members. Each package contains:
            </p>
            <ul className="mb-0 mt-2">
              <li>A unique QR code that employees can scan</li>
              <li>A registration code that must be entered manually</li>
              <li>Both are required for secure registration</li>
            </ul>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <div className="text-center mb-4">
            <button
              className="btn btn-primary btn-lg"
              onClick={generatePackage}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Generating Package...
                </>
              ) : (
                <>
                  <i className="fas fa-plus-circle me-2"></i>
                  Generate New Registration Package
                </>
              )}
            </button>
          </div>

          {currentPackage && (
            <div className="card bg-light mb-4">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">
                  <i className="fas fa-check-circle me-2"></i>
                  Package Generated Successfully!
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 text-center mb-3 mb-md-0">
                    <h6 className="text-muted mb-3">QR Code</h6>
                    <img
                      src={currentPackage.qr_code_url}
                      alt="Registration QR Code"
                      className="img-fluid border rounded p-2"
                      style={{ maxWidth: '250px' }}
                    />
                    <div className="mt-3">
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => downloadQRCode(currentPackage.qr_code_url, currentPackage.registration_code)}
                      >
                        <i className="fas fa-download me-1"></i>
                        Download QR
                      </button>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">Registration Details</h6>
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold">Registration Code:</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control font-monospace fs-5"
                          value={currentPackage.registration_code}
                          readOnly
                        />
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => copyToClipboard(currentPackage.registration_code)}
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Hotel:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={currentPackage.hotel_name || currentPackage.hotel_slug}
                        readOnly
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Status:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={currentPackage.used_by ? 'Used' : 'Available'}
                        readOnly
                      />
                    </div>

                    <div className="d-grid gap-2 mt-4">
                      <button
                        className="btn btn-primary"
                        onClick={() => printPackage(currentPackage)}
                      >
                        <i className="fas fa-print me-2"></i>
                        Print Package
                      </button>
                    </div>
                  </div>
                </div>

                <div className="alert alert-warning mt-4 mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>Important:</strong> Print this package and give it to the new employee. 
                  They need to scan the QR code and enter the registration code to complete their registration.
                </div>
              </div>
            </div>
          )}

          {packages.length > 0 && (
            <div className="mt-4">
              <h5 className="mb-3">Recent Packages</h5>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Registration Code</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.slice(0, 5).map((pkg, index) => (
                      <tr key={index}>
                        <td className="font-monospace">{pkg.registration_code}</td>
                        <td>{new Date(pkg.created_at).toLocaleString()}</td>
                        <td>
                          {pkg.used_by ? (
                            <span className="badge bg-success">Used</span>
                          ) : (
                            <span className="badge bg-warning">Available</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => setCurrentPackage(pkg)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => printPackage(pkg)}
                          >
                            <i className="fas fa-print"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRRegistrationManager;
