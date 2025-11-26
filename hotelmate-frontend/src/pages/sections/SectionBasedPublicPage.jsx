import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import HeroSectionView from '@/components/sections/HeroSectionView';
import GallerySectionView from '@/components/sections/GallerySectionView';
import ListSectionView from '@/components/sections/ListSectionView';
import NewsSectionView from '@/components/sections/NewsSectionView';
import { getPublicHotelPage } from '@/services/sectionEditorApi';
import '@/styles/sections.css';

/**
 * SectionBasedPublicPage - Renders hotel page using section-based system
 */
const SectionBasedPublicPage = () => {
  const { slug } = useParams();
  const { user, isStaff } = useAuth();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPageData = async () => {
    if (!slug) {
      setError('No hotel slug provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPublicHotelPage(slug);
      setPageData(data);
    } catch (err) {
      console.error('Failed to fetch page data:', err);
      if (err.response?.status === 404) {
        setError('Hotel not found');
      } else {
        setError('Failed to load hotel page');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [slug]);

  const renderSection = (section) => {
    // Skip inactive sections
    if (section.is_active === false) {
      return null;
    }

    switch (section.section_type) {
      case 'hero':
        return <HeroSectionView key={section.id} section={section} />;
      case 'gallery':
        return <GallerySectionView key={section.id} section={section} />;
      case 'list':
        return <ListSectionView key={section.id} section={section} onUpdate={fetchPageData} />;
      case 'news':
        return <NewsSectionView key={section.id} section={section} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading hotel page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="min-vh-100 d-flex align-items-center justify-content-center">
        <Alert variant="danger" className="text-center">
          <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '2rem' }}></i>
          <h4 className="mt-3">{error}</h4>
          <p>The hotel page you're looking for could not be loaded.</p>
          <Link to="/" className="btn btn-primary mt-3">
            <i className="bi bi-house me-2"></i>
            Return to Hotels List
          </Link>
        </Alert>
      </Container>
    );
  }

  if (!pageData) {
    return (
      <Container className="min-vh-100 d-flex align-items-center justify-content-center">
        <Alert variant="warning" className="text-center">
          <i className="bi bi-info-circle-fill me-2" style={{ fontSize: '2rem' }}></i>
          <h4 className="mt-3">No Data Available</h4>
          <Link to="/" className="btn btn-primary mt-3">
            <i className="bi bi-house me-2"></i>
            Return to Hotels List
          </Link>
        </Alert>
      </Container>
    );
  }

  const isEmpty = !pageData.sections || pageData.sections.length === 0;

  if (isEmpty && !isStaff) {
    return (
      <Container className="min-vh-100 d-flex align-items-center justify-content-center">
        <Alert variant="info" className="text-center">
          <i className="bi bi-info-circle-fill me-2" style={{ fontSize: '2rem' }}></i>
          <h4 className="mt-3">Coming Soon</h4>
          <p>This hotel's public page is under construction.</p>
          <Link to="/" className="btn btn-primary mt-3">
            <i className="bi bi-house me-2"></i>
            Back to Hotels
          </Link>
        </Alert>
      </Container>
    );
  }

  return (
    <div className="section-based-public-page">
      {/* Navigation Bar */}
      <nav className="navbar navbar-light bg-white shadow-sm sticky-top">
        <Container>
          <Link to="/" className="navbar-brand">
            <i className="bi bi-arrow-left me-2"></i>
            All Hotels
          </Link>
          <div>
            <h5 className="mb-0">{pageData.hotel.name}</h5>
            {pageData.hotel.tagline && (
              <small className="text-muted">{pageData.hotel.tagline}</small>
            )}
          </div>
          {isStaff && (
            <Link 
              to={`/staff/${pageData.hotel.slug}/section-editor`}
              className="btn btn-primary btn-sm"
            >
              <i className="bi bi-pencil me-2"></i>
              Edit Sections
            </Link>
          )}
        </Container>
      </nav>

      {/* Empty State for Staff */}
      {isEmpty && isStaff && (
        <Container className="py-5">
          <Alert variant="info" className="text-center">
            <i className="bi bi-pencil-square me-2" style={{ fontSize: '2rem' }}></i>
            <h4 className="mt-3">Start Building Your Page</h4>
            <p>Add sections to create your hotel's public page.</p>
            <Link 
              to={`/staff/${pageData.hotel.slug}/section-editor`}
              className="btn btn-primary"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Sections
            </Link>
          </Alert>
        </Container>
      )}

      {/* Render Sections */}
      {!isEmpty && pageData.sections.map((section) => renderSection(section))}

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-5">
        <Container>
          <div className="row">
            <div className="col-md-6">
              <h5>{pageData.hotel.name}</h5>
              {pageData.hotel.city && pageData.hotel.country && (
                <p className="text-muted mb-0">
                  {pageData.hotel.city}, {pageData.hotel.country}
                </p>
              )}
            </div>
            <div className="col-md-6 text-md-end">
              <p className="text-muted mb-0">
                &copy; {new Date().getFullYear()} {pageData.hotel.name}. All rights reserved.
              </p>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default SectionBasedPublicPage;
