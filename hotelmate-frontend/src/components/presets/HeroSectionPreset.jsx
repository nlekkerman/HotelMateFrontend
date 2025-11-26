import React, { useState } from 'react';
import { Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { updateHeroSection, uploadHeroImage, uploadHeroLogo } from '@/services/sectionEditorApi';

/**
 * HeroSectionPreset - Renders hero section based on numeric style_variant (1-5)
 * 
 * Preset 1: Light, centered with image below (Clean & Modern)
 * Preset 2: Dark, full-width background image (Dark & Elegant)
 * Preset 3: Minimal text-only (Minimal & Sleek)
 * Preset 4: Split with diagonal (Vibrant & Playful)
 * Preset 5: Split left/right professional (Professional & Structured)
 */
const HeroSectionPreset = ({ section, hotel, onUpdate }) => {
  const { isStaff } = useAuth();
  const heroData = section.hero_data || {};
  const variant = section.style_variant ?? 1; // Default to Preset 1
  
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState(heroData.hero_title || '');
  const [text, setText] = useState(heroData.hero_text || '');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleSave = async () => {
    if (!heroData.id) return;
    
    try {
      setSaving(true);
      await updateHeroSection(hotel.slug, heroData.id, {
        hero_title: title,
        hero_text: text,
      });
      toast.success('Hero updated successfully');
      if (onUpdate) onUpdate();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to update hero:', error);
      toast.error('Failed to update hero');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !heroData.id) return;

    try {
      setUploadingImage(true);
      await uploadHeroImage(hotel.slug, heroData.id, file);
      toast.success('Hero image uploaded');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !heroData.id) return;

    try {
      setUploadingLogo(true);
      await uploadHeroLogo(hotel.slug, heroData.id, file);
      toast.success('Logo uploaded');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Common hero content structure (logo, then image with text overlay)
  const renderHeroContent = () => (
    <div className="hero__content-centered">
      {heroData.hero_logo_url && (
        <img src={heroData.hero_logo_url} alt="Logo" className="hero__logo" />
      )}
      {heroData.hero_image_url && (
        <div className="hero__image-wrapper">
          <img src={heroData.hero_image_url} alt={heroData.hero_title || 'Hero'} className="hero__image" />
          <div className="hero__text-overlay">
            <h1 className={`hero__title font-preset-${variant}-heading`}>{heroData.hero_title || 'Welcome'}</h1>
            <p className={`hero__text font-preset-${variant}-body`}>{heroData.hero_text || 'Your perfect getaway awaits'}</p>
          </div>
        </div>
      )}
      {!heroData.hero_image_url && (
        <>
          <h1 className={`hero__title font-preset-${variant}-heading`}>{heroData.hero_title || 'Welcome'}</h1>
          <p className={`hero__text font-preset-${variant}-body`}>{heroData.hero_text || 'Your perfect getaway awaits'}</p>
        </>
      )}
    </div>
  );

  // Preset 1: Clean & Modern - Logo above, text in lower right, edit button on hover
  if (variant === 1) {
    return (
      <section className={`hero hero--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
        {/* Logo above hero image - centered */}
        {heroData.hero_logo_url && (
          <div className="section-container">
            <div className="text-center mb-3" style={{ position: 'relative', zIndex: 2 }}>
              <img 
                src={heroData.hero_logo_url} 
                alt="Logo" 
                style={{ 
                  maxWidth: '250px', 
                  maxHeight: '120px',
                  objectFit: 'contain'
                }} 
              />
            </div>
          </div>
        )}
        
        {/* Hero Image with text overlay and edit button */}
        {heroData.hero_image_url ? (
          <div 
            className="hero__image-wrapper position-relative"
            style={{ 
              position: 'relative',
              overflow: 'hidden',
              width: '100vw'
            }}
          >
              <img 
                src={heroData.hero_image_url} 
                alt={heroData.hero_title || 'Hero'} 
                className="hero__image"
                style={{
                  width: '100vw',
                  height: '500px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              
              {/* Text overlay in lower right corner */}
              <div 
                className="hero__text-overlay"
                style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '30px',
                  maxWidth: '500px',
                  textAlign: 'right',
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                  zIndex: 1
                }}
              >
                <h1 className={`hero__title font-preset-${variant}-heading`} style={{ fontSize: '2.5rem', marginBottom: '1rem', whiteSpace: 'nowrap' }}>
                  {heroData.hero_title || 'Welcome'}
                </h1>
                <p className={`hero__text font-preset-${variant}-body`} style={{ fontSize: '1.2rem', marginBottom: 0 }}>
                  {heroData.hero_text || 'Your perfect getaway awaits'}
                </p>
              </div>
              
              {/* Edit button on hover with alpha transition */}
              {isStaff && hotel && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setShowModal(true)}
                  className="hero__edit-btn"
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 2,
                    opacity: 0.5,
                    transition: 'opacity 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                >
                  <i className="bi bi-pencil-square me-2"></i>Edit Hero
                </Button>
              )}
          </div>
        ) : (
          <div className="section-container">
            {/* Fallback if no image */}
            {isStaff && hotel && (
              <div className="text-end mb-3">
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="shadow">
                  <i className="bi bi-pencil-square me-2"></i>Edit Hero
                </Button>
              </div>
            )}
            <div className="text-center py-5">
              <h1 className={`hero__title font-preset-${variant}-heading`}>{heroData.hero_title || 'Welcome'}</h1>
              <p className={`hero__text font-preset-${variant}-body`}>{heroData.hero_text || 'Your perfect getaway awaits'}</p>
            </div>
          </div>
        )}
        {renderEditModal()}
      </section>
    );
  }

  // Preset 2: Dark & Elegant
  if (variant === 2) {
    return (
      <section className={`hero hero--preset-2 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container hero__container">
          {isStaff && hotel && (
            <div className="text-end mb-3">
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="shadow">
                <i className="bi bi-pencil-square me-2"></i>Edit Hero
              </Button>
            </div>
          )}
          {renderHeroContent()}
        </div>
        {renderEditModal()}
      </section>
    );
  }

  // Preset 3: Minimal & Sleek
  if (variant === 3) {
    return (
      <section className={`hero hero--preset-3 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container hero__container">
          {isStaff && hotel && (
            <div className="text-end mb-3">
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                <i className="bi bi-pencil-square me-2"></i>Edit Hero
              </Button>
            </div>
          )}
          {renderHeroContent()}
        </div>
        {renderEditModal()}
      </section>
    );
  }

  // Preset 4: Vibrant & Playful
  if (variant === 4) {
    return (
      <section className={`hero hero--preset-4 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container hero__container">
          {isStaff && hotel && (
            <div className="text-end mb-3">
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="shadow">
                <i className="bi bi-pencil-square me-2"></i>Edit Hero
              </Button>
            </div>
          )}
          {renderHeroContent()}
        </div>
        {renderEditModal()}
      </section>
    );
  }

  // Preset 5: Professional & Structured
  if (variant === 5) {
    return (
      <section className={`hero hero--preset-5 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container hero__container">
          {isStaff && hotel && (
            <div className="text-end mb-3">
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="shadow">
                <i className="bi bi-pencil-square me-2"></i>Edit Hero
              </Button>
            </div>
          )}
          {renderHeroContent()}
        </div>
        {renderEditModal()}
      </section>
    );
  }

  // Fallback to Preset 1
  return (
    <section className={`hero hero--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
      <div className="section-container hero__container">
        {isStaff && hotel && (
          <div className="text-end mb-3">
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="shadow">
              <i className="bi bi-pencil-square me-2"></i>Edit Hero
            </Button>
          </div>
        )}
        {renderHeroContent()}
      </div>
      {renderEditModal()}
    </section>
  );

  function renderEditModal() {
    return (
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Hero Section</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter hero title"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Text</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter hero description"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Background Image</Form.Label>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
              {uploadingImage && <Spinner animation="border" size="sm" />}
            </div>
            {heroData.hero_image_url && (
              <img 
                src={heroData.hero_image_url} 
                alt="Current" 
                className="mt-2"
                style={{ maxHeight: '100px', borderRadius: '8px' }}
              />
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Logo</Form.Label>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
              {uploadingLogo && <Spinner animation="border" size="sm" />}
            </div>
            {heroData.hero_logo_url && (
              <img 
                src={heroData.hero_logo_url} 
                alt="Current logo" 
                className="mt-2"
                style={{ maxHeight: '60px', borderRadius: '8px' }}
              />
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <><Spinner animation="border" size="sm" className="me-2" /> Saving...</> : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
};

export default HeroSectionPreset;
