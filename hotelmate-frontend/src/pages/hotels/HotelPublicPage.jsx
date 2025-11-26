import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { getPublicHotelPage, listSections, updatePageStyle } from '@/services/sectionEditorApi';
import { useAuth } from '@/context/AuthContext';
import HeroSectionPreset from '@/components/presets/HeroSectionPreset';
import GallerySectionPreset from '@/components/presets/GallerySectionPreset';
import ListSectionPreset from '@/components/presets/ListSectionPreset';
import NewsSectionPreset from '@/components/presets/NewsSectionPreset';
import FooterSectionPreset from '@/components/presets/FooterSectionPreset';
import InlinePageBuilder from '@/components/builder/InlinePageBuilder';
import PresetSelector from '@/components/presets/PresetSelector';
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
  const [updatingStyle, setUpdatingStyle] = useState(false);

  const fetchPageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
     
      // Get basic page data
      const data = await getPublicHotelPage(slug);
      
      // If staff, fetch ALL sections (including inactive) using staff endpoint
      if (isStaff) {
        const allSections = await listSections(slug);
        // Ensure we have an array
        data.sections = Array.isArray(allSections) ? allSections : [];
      }
      
      // Ensure sections is always an array
      if (!Array.isArray(data.sections)) {
        console.warn('[HotelPublicPage] ⚠️ sections is not an array, defaulting to empty array');
        data.sections = [];
      }
      
      console.log('[HotelPublicPage] Final sections count:', data?.sections?.length);
      console.log('[HotelPublicPage] First section after processing:', data.sections?.[0]);
      
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

  // Debug: Check DOM attribute after render
  useEffect(() => {
    const pageElement = document.querySelector('.hotel-public-page');
    if (pageElement && pageData) {
      const attrValue = pageElement.getAttribute('data-preset');
      console.log('[HotelPublicPage] 🔍 DOM Check - data-preset attribute value:', attrValue);
      console.log('[HotelPublicPage] 🔍 DOM Check - getCurrentVariant():', getCurrentVariant());
    }
  }, [pageData]); // Check whenever pageData changes

  /**
   * Handle style preset change
   */
  const handleStyleChange = async (newVariant) => {
    try {
      setUpdatingStyle(true);
      console.log('[HotelPublicPage] 🎨 Updating page style to variant:', newVariant);
      console.log('[HotelPublicPage] 📊 Before change - Current preset:', getCurrentVariant());
      console.log('[HotelPublicPage] 📊 Page root element data-preset:', document.querySelector('.hotel-public-page')?.getAttribute('data-preset'));
      
      const result = await updatePageStyle(slug, newVariant);
      console.log('[HotelPublicPage] ✅ Update result from backend:', result);
      
      // Refresh page data to get updated sections
      await fetchPageData();
      
      console.log('[HotelPublicPage] ✅ Page style updated successfully');
      console.log('[HotelPublicPage] 📊 After change - New current variant:', getCurrentVariant());
      console.log('[HotelPublicPage] 📊 Page root element data-preset:', document.querySelector('.hotel-public-page')?.getAttribute('data-preset'));
      
      // Debug button styling
      setTimeout(() => {
        const pageRoot = document.querySelector('.hotel-public-page');
        console.log('[HotelPublicPage] 🔍 Page root data-preset:', pageRoot?.getAttribute('data-preset'));
        
        const heroBtn = document.querySelector('.hero-edit');
        if (heroBtn) {
          const styles = window.getComputedStyle(heroBtn);
          console.log('[HotelPublicPage] 🔍 Hero button found:', heroBtn);
          console.log('[HotelPublicPage] 🔍 Hero button classes:', heroBtn.className);
          console.log('[HotelPublicPage] 🔍 Hero button computed styles:');
          console.log('  - background:', styles.background);
          console.log('  - backgroundColor:', styles.backgroundColor);
          console.log('  - border:', styles.border);
          console.log('  - borderColor:', styles.borderColor);
          console.log('  - color:', styles.color);
          console.log('  - boxShadow:', styles.boxShadow);
          
          // Check CSS selector specificity
          console.log('[HotelPublicPage] 🔍 Testing CSS selector: [data-preset="' + newVariant + '"] .hero-edit');
          const matchingRule = Array.from(document.styleSheets)
            .flatMap(sheet => {
              try { return Array.from(sheet.cssRules || []); } 
              catch(e) { return []; }
            })
            .find(rule => rule.selectorText?.includes(`[data-preset="${newVariant}"] .hero-edit`));
          console.log('[HotelPublicPage] 🔍 Matching CSS rule:', matchingRule?.cssText);
        } else {
          console.log('[HotelPublicPage] ⚠️ Hero button NOT FOUND');
        }
        
        const listBtn = document.querySelector('.list-section-add-list');
        if (listBtn) {
          const styles = window.getComputedStyle(listBtn);
          console.log('[HotelPublicPage] 🔍 List button found:', listBtn);
          console.log('[HotelPublicPage] 🔍 List button classes:', listBtn.className);
          console.log('[HotelPublicPage] 🔍 List button parent:', listBtn.parentElement);
          console.log('[HotelPublicPage] 🔍 List button ancestor with data-preset:', listBtn.closest('[data-preset]'));
          console.log('[HotelPublicPage] 🔍 Selector test - [data-preset="' + newVariant + '"] .list-section-add-list matches:', document.querySelector('[data-preset="' + newVariant + '"] .list-section-add-list'));
          console.log('[HotelPublicPage] 🔍 List button computed styles:');
          console.log('  - background:', styles.background);
          console.log('  - border:', styles.border);
          console.log('  - color:', styles.color);
          
          // Check all matching stylesheets
          const allRules = Array.from(document.styleSheets)
            .flatMap(sheet => {
              try { return Array.from(sheet.cssRules || []); } 
              catch(e) { return []; }
            })
            .filter(rule => rule.selectorText?.includes('.list-section-add-list'))
            .map(rule => ({ selector: rule.selectorText, style: rule.style.cssText }));
          console.log('[HotelPublicPage] 🔍 All CSS rules for .list-section-add-list:', allRules);
        } else {
          console.log('[HotelPublicPage] ⚠️ List button NOT FOUND');
        }
      }, 100);

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
    console.log('[HotelPublicPage] getCurrentVariant returning:', variant, 'from section:', pageData.sections[0]?.name);
    return variant;
  };

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
  const currentPreset = getCurrentVariant();
  console.log('[HotelPublicPage] 🎯 Rendering page with data-preset:', currentPreset);
  console.log('[HotelPublicPage] 🎯 Type of currentPreset:', typeof currentPreset, 'Value:', currentPreset);
  console.log('[HotelPublicPage] 📋 All sections:', pageData.sections.map(s => ({ name: s.name, variant: s.style_variant })));
  
  // Force string conversion for data attribute
  const presetValue = String(currentPreset);
  console.log('[HotelPublicPage] 🎯 Setting data-preset to:', presetValue);
  
  return (
    <div 
      className={`hotel-public-page ${isStaff && user ? 'has-preset-selector' : ''}`}
      data-preset={presetValue}
    >
      {/* Preset Selector with Inline Builder - Only for authenticated staff on public page */}
      {isStaff && user && (
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