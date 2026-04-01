import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Button, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  listRegistrationPackages,
  generateRegistrationPackages,
} from '@/services/registrationPackageApi';
import RegistrationPackageCard from './RegistrationPackageCard';
import EmailRegistrationPackageModal from './EmailRegistrationPackageModal';
import { printRegistrationPackage } from './PrintableRegistrationPackageView';

export default function RegistrationPackagesPanel() {
  const { hotelSlug } = useParams();
  const { user } = useAuth();
  const { canAccess, isSuperUser } = usePermissions();

  const slug = hotelSlug || user?.hotel_slug;

  // Admin check
  const isAdmin =
    isSuperUser ||
    canAccess(['staff_admin', 'super_staff_admin']);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generation state
  const [genCount, setGenCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState(null);

  // Email modal
  const [emailPkg, setEmailPkg] = useState(null);

  const fetchPackages = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listRegistrationPackages(slug);
      const data = res.data;
      setPackages(
        Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          'Failed to load registration packages'
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleGenerate = async () => {
    if (!slug || genCount < 1) return;
    setGenerating(true);
    setGenSuccess(null);
    setError(null);
    try {
      const res = await generateRegistrationPackages(slug, genCount);
      const newPkgs = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.packages)
        ? res.data.packages
        : [res.data];
      setPackages((prev) => [...newPkgs, ...prev]);
      setGenSuccess(`${newPkgs.length} package(s) generated successfully.`);
      setTimeout(() => setGenSuccess(null), 4000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          'Failed to generate packages'
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div>
      {/* Generation controls */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="mb-3">
            <i className="bi bi-plus-circle me-2"></i>
            Generate Registration Packages
          </h5>
          <div className="d-flex align-items-end gap-3 flex-wrap">
            <div>
              <Form.Label className="small text-muted mb-1">
                Number of packages
              </Form.Label>
              <InputGroup style={{ maxWidth: '160px' }}>
                <Form.Select
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  disabled={generating}
                >
                  {[1, 2, 3, 5, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </div>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Spinner size="sm" className="me-1" /> Generating...
                </>
              ) : (
                <>
                  <i className="bi bi-qr-code me-1"></i> Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {genSuccess && (
        <Alert variant="success" dismissible onClose={() => setGenSuccess(null)}>
          <i className="bi bi-check-circle me-2"></i>
          {genSuccess}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2 text-muted">Loading packages...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && packages.length === 0 && !error && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1 d-block mb-2"></i>
          No registration packages yet. Generate some above.
        </div>
      )}

      {/* Package grid */}
      {!loading && packages.length > 0 && (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {packages.map((pkg) => (
            <Col key={pkg.id}>
              <RegistrationPackageCard
                pkg={pkg}
                onEmail={(p) => setEmailPkg(p)}
                onPrint={(p) => printRegistrationPackage(p)}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Email modal */}
      {emailPkg && (
        <EmailRegistrationPackageModal
          show={!!emailPkg}
          onHide={() => setEmailPkg(null)}
          pkg={emailPkg}
          hotelSlug={slug}
        />
      )}
    </div>
  );
}
