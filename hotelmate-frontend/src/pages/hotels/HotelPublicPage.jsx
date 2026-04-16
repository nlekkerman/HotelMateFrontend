import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { getPublicHotelPage, listSections, updatePageStyle } from '@/services/sectionEditorApi';
import { useAuth } from '@/context/AuthContext';
import { usePublicPagePermissions } from '@/hooks/usePublicPagePermissions';
import HeroSectionPreset from '@/components/presets/HeroSectionPreset';
import GallerySectionPreset from '@/components/presets/GallerySectionPreset';
import ListSectionPreset from '@/components/presets/ListSectionPreset';
import NewsSectionPreset from '@/components/presets/NewsSectionPreset';
import FooterSectionPreset from '@/components/presets/FooterSectionPreset';
import RoomsSectionView from '@/components/sections/RoomsSectionView';
import InlinePageBuilder from '@/components/builder/InlinePageBuilder';
import PresetSelector from '@/components/presets/PresetSelector';
import { debugRoomTypesAPI } from '@/utils/debugRoomTypes';
import '@/styles/hotelPublicPage.css';

/**
 * HotelPublicPage - Dynamic hotel public page builder
 * 
 * Fetches page configuration from backend and renders sections dynamically
 * based on element types (hero, rooms_list, cards_list, gallery, reviews_list, contact_block)
 */
const HotelPublicPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { canEditPublicPage } = usePublicPagePermissions(slug);
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStyle, setUpdatingStyle] = useState(false);

  const fetchPageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
     
      // Get basic page data (includes all sections with full data)
      const data = await getPublicHotelPage(slug);
      
      // Debug section types to identify backend issues
      if (data.sections?.length > 0) {
        data.sections.forEach((section, index) => {
          // Flag problematic sections
          if (section.section_type === 'unknown' || !section.section_type) {
            console.error(`  ❌ PROBLEMATIC SECTION FOUND: ID=${section.id}, Name="${section.name}"`);
            console.error(`     - section_type: "${section.section_type}"`);
            console.error(`     - element_type: "${section.element?.element_type || 'N/A'}"`);
            console.error(`     - All properties:`, Object.keys(section));
            console.error(`     - Full section data:`, section);
          }
        });
      }
      
      // Run debug utility to understand the API response
      await debugRoomTypesAPI(slug);
      
      // Log room types data following API guide structure
      const roomsSections = data.sections?.filter(section => 
        section.element?.element_type === 'rooms_list' || section.section_type === 'rooms'
      );
      
      roomsSections?.forEach((section, index) => {
        if (section.rooms_data?.room_types?.length > 0) {
          // Room types found OK
        } else {
          console.warn('[HotelPublicPage] ⚠️ No room types found in this section');
        }
      });
      
      // Also check if rooms data is in a different location
      
      // Note: Public API already returns all sections (active + inactive for staff)
      // with complete data including section_type, hero_data, galleries, etc.
      // No need to fetch from staff endpoint as it returns incomplete data
      
      // Ensure sections is always an array
      if (!Array.isArray(data.sections)) {
        console.warn('[HotelPublicPage] ⚠️ sections is not an array, defaulting to empty array');
        data.sections = [];
      }
      
      // Map 'type' to 'section_type' if section_type is missing
      data.sections = data.sections.map(section => {
        if (!section.section_type && section.type) {
          return { ...section, section_type: section.type };
        }
        return section;
      });
      
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
    if (!slug) {
      setError('No hotel slug provided');
      setLoading(false);
      return;
    }

    fetchPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, canEditPublicPage]); // Re-run when slug or edit permission changes

  // Debug: Check DOM attribute after render
  useEffect(() => {
    const pageElement = document.querySelector('.hotel-public-page');
    if (pageElement && pageData) {
    }
  }, [pageData]); // Check whenever pageData changes

  /**
   * Handle style preset change
   */
  const handleStyleChange = async (newVariant) => {
    try {
      setUpdatingStyle(true);
      
      const result = await updatePageStyle(slug, newVariant);
      
      // Refresh page data to get updated sections
      await fetchPageData();

    } catch (err) {
      console.error('[HotelPublicPage] ❌ Failed to update page style:', err);
      alert('Failed to update page style. Please try again.');
    } finally {
      setUpdatingStyle(false);
    }
  };

  /**
   * Get current page style variant (from first section or default to 1)
   */
  const getCurrentVariant = () => {
    if (!pageData?.sections || pageData.sections.length === 0) {
      return 1;
    }
    const variant = pageData.sections[0]?.style_variant || 1;
    return variant;
  };

  /**
   * Render section based on NEW section type
   */
  const renderSection = (section) => {
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
        
        case 'rooms':
          return <RoomsSectionView key={section.id} section={section} />;
        
        case 'footer':
          return <FooterSectionPreset key={section.id} section={section} hotel={pageData.hotel} />;
        
        case 'unknown':
          console.warn(`[HotelPublicPage] Section with unknown type found:`, section);
          // Try to determine the actual type based on element_type or other properties
          if (section.element?.element_type) {
            // Create a new section object with the corrected type
            const correctedSection = { ...section, section_type: section.element.element_type };
            return renderSection(correctedSection);
          }
          // If we can't determine the type, show a debug info card for own-hotel staff editors
          return canEditPublicPage ? (
            <div key={section.id} className="alert alert-info m-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Unknown Section (ID: {section.id})</strong>
              <br />
              <small>Type: {section.section_type} | Element Type: {section.element?.element_type || 'N/A'}</small>
              <br />
              <small>This section needs to be configured with a proper section type.</small>
            </div>
          ) : null;
        
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
  
  if (isEmpty && !canEditPublicPage) {
    // Non-editors see "Coming Soon" for empty pages
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
  const currentPreset = getCurrentVariant();
  
  // Force string conversion for data attribute
  const presetValue = String(currentPreset);
  
  return (
    <div 
      className={`hotel-public-page page-style-${currentPreset} ${canEditPublicPage ? 'has-preset-selector' : ''}`}
      data-preset={presetValue}
    >
      {/* Preset Selector — own-hotel admin staff only */}
      {canEditPublicPage && (
        <PresetSelector 
          currentVariant={getCurrentVariant()}
          onVariantChange={handleStyleChange}
          hotelSlug={slug}
          loading={updatingStyle}
          hotel={pageData.hotel}
          sections={pageData.sections}
          onUpdate={fetchPageData}
        />
      )}

      {/* Back button (top-left) */}
      <div className="position-fixed" style={{ top: '120px', left: '20px', zIndex: 1000 }}>
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

      {/* Empty state message - own-hotel admin editors only */}
      {isEmpty && canEditPublicPage && (
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

      {/* Note: My Bookings feature removed - now using token-based booking management */}
    </div>
  );
};

export default HotelPublicPage;