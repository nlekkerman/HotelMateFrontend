import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';

export default function RegistrationPackageCard({ pkg, onEmail, onPrint }) {
  const isUsed = pkg.status === 'used' || !!pkg.used_at;

  return (
    <Card className="shadow-sm h-100">
      <Card.Body className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Badge bg={isUsed ? 'secondary' : 'success'}>
            {isUsed ? 'Used' : 'Unused'}
          </Badge>
          <small className="text-muted">
            {new Date(pkg.created_at).toLocaleDateString()}
          </small>
        </div>

        {/* QR + Code paired together */}
        <div className="text-center mb-3">
          {pkg.qr_code_url && (
            <img
              src={pkg.qr_code_url}
              alt="Registration QR"
              className="img-fluid border rounded p-1 bg-white mb-2"
              style={{ maxWidth: '160px' }}
            />
          )}
          <div
            className="font-monospace fw-bold fs-5 text-center"
            style={{ letterSpacing: '2px' }}
          >
            {pkg.registration_code || pkg.code}
          </div>
        </div>

        {pkg.registration_url && (
          <div className="mb-2">
            <small className="text-muted text-break d-block">
              {pkg.registration_url}
            </small>
          </div>
        )}

        {pkg.hotel_name && (
          <small className="text-muted d-block mb-2">{pkg.hotel_name}</small>
        )}

        {isUsed && pkg.used_at && (
          <small className="text-muted d-block mb-2">
            Used: {new Date(pkg.used_at).toLocaleString()}
          </small>
        )}

        {/* Actions */}
        {!isUsed && (
          <div className="d-flex gap-2 mt-3">
            <Button
              variant="outline-primary"
              size="sm"
              className="flex-fill"
              onClick={() => onEmail(pkg)}
            >
              <i className="bi bi-envelope me-1"></i> Email
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              className="flex-fill"
              onClick={() => onPrint(pkg)}
            >
              <i className="bi bi-printer me-1"></i> Print
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
