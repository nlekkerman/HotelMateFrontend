import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { getPublicHotelPage, listSections } from '@/services/sectionEditorApi';
import { useAuth } from '@/context/AuthContext';
import HeroSectionPreset from '@/components/presets/HeroSectionPreset';
import GallerySectionPreset from '@/components/presets/GallerySectionPreset';
import ListSectionPreset from '@/components/presets/ListSectionPreset';
import NewsSectionPreset from '@/components/presets/NewsSectionPreset';
import FooterSectionPreset from '@/components/presets/FooterSectionPreset';
import InlinePageBuilder from '@/components/builder/InlinePageBuilder';
import '@/styles/hotelPublicPage.css';

/**
 * HotelPublicPage - Dynamic hotel public page builder
 * 
 * Fetches page configuration from backend and renders sections dynamically
 * based on element types (hero, rooms_list, cards_list, gallery, reviews_list, contact_block)
 */
const HotelPublicPage = () => {
  const { slug } = useParams();
  const { user, isStaff } = useAuth();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[HotelPublicPage] Fetching NEW section-based page for: ${slug}`);
      console.log(`[HotelPublicPage] User is staff: ${isStaff}`);
      
      // Get basic page data
      const data = await getPublicHotelPage(slug);
      
      console.log('[HotelPublicPage] ✅ Public page data received:', data);
      console.log('[HotelPublicPage] Hotel:', data?.hotel);
      console.log('[HotelPublicPage] Public sections count:', data?.sections?.length);
      
      // If staff, fetch ALL sections (including inactive) using staff endpoint
      if (isStaff) {
        console.log('[HotelPublicPage] 👤 Staff user - fetching ALL sections from staff endpoint');
        const allSections = await listSections(slug);
        console.log('[HotelPublicPage] ✅ Staff sections received:', allSections);
        console.log('[HotelPublicPage] Staff sections count:', allSections?.length);
        // Ensure we have an array
        data.sections = Array.isArray(allSections) ? allSections : [];
      }
      
      // Ensure sections is always an array
      if (!Array.isArray(data.sections)) {
        console.warn('[HotelPublicPage] ⚠️ sections is not an array, defaulting to empty array');
        data.sections = [];
      }
      
      console.log('[HotelPublicPage] Final sections count:', data?.sections?.length);
      
      setPageData(data);
      
    } catch (err) {
      console.error('[HotelPublicPage] ❌ Failed to fetch page data:', err);
      
      if (err.response?.status === 404) {
        setError('Hotel not found');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to backend server');
      } else {
        setError(`Failed to load hotel page: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    console.log('[HotelPublicPage] useEffect triggered, slug:', slug);
    
    if (!slug) {
      setError('No hotel slug provided');
      setLoading(false);
      return;
    }

    fetchPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isStaff]); // Re-run when slug or staff status changes

  /**
   * Render section based on NEW section type
   */
  const renderSection = (section) => {
    console.log('[HotelPublicPage] 🎨 Rendering section:', section.name, 'Type:', section.section_type);
    
    // Skip inactive sections
    if (section.is_active === false) {
      return null;
    }

    try {
      switch (section.section_type) {
        case 'hero':
          return <HeroSectionPreset key={section.id} section={section} hotel={pageData.hotel} onUpdate={fetchPageData} />;
        
        case 'gallery':
          return <GallerySectionPreset key={section.id} section={section} onUpdate={fetchPageData} />;
        
        case 'list':
          return <ListSectionPreset key={section.id} section={section} onUpdate={fetchPageData} />;
        
        case 'news':
          return <NewsSectionPreset key={section.id} section={section} onUpdate={fetchPageData} />;
        
        case 'footer':
          return <FooterSectionPreset key={section.id} section={section} hotel={pageData.hotel} />;
        
        default:
          console.warn(`[HotelPublicPage] Unknown section type: ${section.section_type}`);
          return (
            <div key={section.id} className="alert alert-warning m-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Unsupported section type: {section.section_type}
            </div>
          );
      }
    } catch (err) {
      console.error(`[HotelPublicPage] Error rendering section ${section.id}:`, err);
      return (
        <div key={section.id} className="alert alert-danger m-3">
          <i className="bi bi-x-circle me-2"></i>
          Failed to render section
        </div>
      );
    }
  };

  // Loading state
  if (loading) {
    console.log('[HotelPublicPage] RENDERING: Loading state');
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading hotel page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.log('[HotelPublicPage] RENDERING: Error state -', error);
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

  // No data or empty sections
  if (!pageData) {
    console.log('[HotelPublicPage] RENDERING: No pageData');
    return (
      <Container className="min-vh-100 d-flex align-items-center justify-content-center">
        <Alert variant="warning" className="text-center">
          <i className="bi bi-info-circle-fill me-2" style={{ fontSize: '2rem' }}></i>
          <h4 className="mt-3">No Data</h4>
          <p>Could not load hotel page data.</p>
          <Link to="/" className="btn btn-primary mt-3">
            <i className="bi bi-house me-2"></i>
            Return to Hotels List
          </Link>
        </Alert>
      </Container>
    );
  }

  // Empty sections - show empty canvas with builder for staff
  const isEmpty = !pageData.sections || !Array.isArray(pageData.sections) || pageData.sections.length === 0;
  
  if (isEmpty && !isStaff) {
    // For non-staff - show simple message
    console.log('[HotelPublicPage] RENDERING: Empty sections (non-staff)');
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
  
  // Render page
  console.log('[HotelPublicPage] RENDERING: Full page with', pageData.sections.length, 'sections');
  return (
    <div className="hotel-public-page">
      {/* Inline Builder - Only for staff */}
      {isStaff && user && (
        <InlinePageBuilder 
          hotel={pageData.hotel}
          sections={pageData.sections}
          onUpdate={fetchPageData}
        />
      )}

      {/* Back button (top-left) */}
      <div className="position-fixed" style={{ top: '20px', left: '20px', zIndex: 1000 }}>
        <Link 
          to="/?view=all" 
          className="btn btn-light shadow"
          style={{ 
            borderRadius: '50px',
            padding: '10px 20px'
          }}
        >
          <i className="bi bi-arrow-left me-2"></i>
          All Hotels
        </Link>
      </div>

      {/* Empty state message */}
      {isEmpty && (
        <Container className="min-vh-100 d-flex align-items-center justify-content-center">
          <Alert variant="info" className="text-center" style={{ maxWidth: '600px' }}>
            <i className="bi bi-pencil-square me-2" style={{ fontSize: '3rem' }}></i>
            <h4 className="mt-3">Start Building Your Page</h4>
            <p className="lead">Click <strong>Edit Sections</strong> button (top-right) to add content.</p>
            <p className="text-muted">Add Hero sections, Photo Galleries, Cards/Lists, and News articles.</p>
          </Alert>
        </Container>
      )}

      {/* Render sections */}
      {!isEmpty && Array.isArray(pageData.sections) && pageData.sections
        .sort((a, b) => a.position - b.position)
        .map((section) => renderSection(section))
      }

      {/* Default Footer if no footer section exists */}
      {!isEmpty && !pageData.sections.some(s => s.section_type === 'footer') && (
        <FooterSectionPreset hotel={pageData.hotel} />
      )}
    </div>
  );
};

export default HotelPublicPage;