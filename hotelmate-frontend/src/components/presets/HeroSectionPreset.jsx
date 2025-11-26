import React, { useState } from 'react';
import { Container, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { updateHeroSection, uploadHeroImage, uploadHeroLogo } from '@/services/sectionEditorApi';
import { HERO_VARIANTS } from '@/types/presets';

/**
 * HeroSectionPreset - Renders hero section based on layout_preset.key
 * 
 * Supported variants:
 * - hero_classic_centered (default)
 * - hero_split_image_left
 * - hero_split_image_right
 * - hero_image_background
 * - hero_minimal
 * - hero_split_diagonal
 */
const HeroSectionPreset = ({ section, hotel, onUpdate }) => {
  const { isStaff } = useAuth();
  const heroData = section.hero_data || {};
  const variantKey = section.layout_preset?.key ?? HERO_VARIANTS.CLASSIC_CENTERED;
  
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

  // Split Image Left Layout
  if (variantKey === HERO_VARIANTS.SPLIT_IMAGE_LEFT) {
    return (
      <section className={`hero hero--split-image-left ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="hero__split-container">
          <div className="hero__image-half">
            {heroData.hero_image_url && (
              <img src={heroData.hero_image_url} alt={heroData.hero_title || 'Hero'} />
            )}
          </div>
          <div className="hero__content-half">
            <Container>
              {isStaff && hotel && (
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="mb-3">
                  <i className="bi bi-pencil-square me-2"></i>Edit Hero
                </Button>
              )}
              {heroData.hero_logo_url && (
                <img src={heroData.hero_logo_url} alt="Logo" className="hero__logo mb-4" />
              )}
              <h1 className="hero__title">{heroData.hero_title || 'Welcome'}</h1>
              <p className="hero__text">{heroData.hero_text || 'Your perfect getaway awaits'}</p>
            </Container>
          </div>
        </div>
        {renderEditModal()}
      </section>
    );
  }

  // Split Image Right Layout
  if (variantKey === HERO_VARIANTS.SPLIT_IMAGE_RIGHT) {
    return (
      <section className={`hero hero--split-image-right ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="hero__split-container">
          <div className="hero__content-half">
            <Container>
              {isStaff && hotel && (
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="mb-3">
                  <i className="bi bi-pencil-square me-2"></i>Edit Hero
                </Button>
              )}
              {heroData.hero_logo_url && (
                <img src={heroData.hero_logo_url} alt="Logo" className="hero__logo mb-4" />
              )}
              <h1 className="hero__title">{heroData.hero_title || 'Welcome'}</h1>
              <p className="hero__text">{heroData.hero_text || 'Your perfect getaway awaits'}</p>
            </Container>
          </div>
          <div className="hero__image-half">
            {heroData.hero_image_url && (
              <img src={heroData.hero_image_url} alt={heroData.hero_title || 'Hero'} />
            )}
          </div>
        </div>
        {renderEditModal()}
      </section>
    );
  }

  // Image Background Layout
  if (variantKey === HERO_VARIANTS.IMAGE_BACKGROUND) {
    return (
      <section 
        className={`hero hero--image-background ${section.is_active === false ? 'section-inactive' : ''}`}
        style={{
          backgroundImage: heroData.hero_image_url ? `url(${heroData.hero_image_url})` : 'none',
        }}
      >
        <div className="hero__overlay"></div>
        <Container className="hero__container">
          {isStaff && hotel && (
            <div className="text-end mb-3">
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="shadow">
                <i className="bi bi-pencil-square me-2"></i>Edit Hero
              </Button>
            </div>
          )}
          <div className="hero__content-centered">
            {heroData.hero_logo_url && (
              <img src={heroData.hero_logo_url} alt="Logo" className="hero__logo mb-4" />
            )}
            <h1 className="hero__title">{heroData.hero_title || 'Welcome'}</h1>
            <p className="hero__text">{heroData.hero_text || 'Your perfect getaway awaits'}</p>
          </div>
        </Container>
        {renderEditModal()}
      </section>
    );
  }

  // Minimal Layout
  if (variantKey === HERO_VARIANTS.MINIMAL) {
    return (
      <section className={`hero hero--minimal ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container className="hero__container">
          {isStaff && hotel && (
            <div className="text-end mb-3">
              <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                <i className="bi bi-pencil-square me-2"></i>Edit Hero
              </Button>
            </div>
          )}
          <div className="hero__content-minimal">
            <h1 className="hero__title-minimal">{heroData.hero_title || 'Welcome'}</h1>
            <p className="hero__text-minimal">{heroData.hero_text || 'Your perfect getaway awaits'}</p>
          </div>
        </Container>
        {renderEditModal()}
      </section>
    );
  }

  // Split Diagonal Layout
  if (variantKey === HERO_VARIANTS.SPLIT_DIAGONAL) {
    return (
      <section className={`hero hero--split-diagonal ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="hero__diagonal-container">
          <div className="hero__diagonal-image" style={{ backgroundImage: heroData.hero_image_url ? `url(${heroData.hero_image_url})` : 'none' }}></div>
          <div className="hero__diagonal-content">
            <Container>
              {isStaff && hotel && (
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="mb-3">
                  <i className="bi bi-pencil-square me-2"></i>Edit Hero
                </Button>
              )}
              {heroData.hero_logo_url && (
                <img src={heroData.hero_logo_url} alt="Logo" className="hero__logo mb-4" />
              )}
              <h1 className="hero__title">{heroData.hero_title || 'Welcome'}</h1>
              <p className="hero__text">{heroData.hero_text || 'Your perfect getaway awaits'}</p>
            </Container>
          </div>
        </div>
        {renderEditModal()}
      </section>
    );
  }

  // Default: Classic Centered Layout
  return (
    <section className={`hero hero--classic-centered ${section.is_active === false ? 'section-inactive' : ''}`}>
      <Container className="hero__container">
        {isStaff && hotel && (
          <div className="text-end mb-3">
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)} className="shadow">
              <i className="bi bi-pencil-square me-2"></i>Edit Hero
            </Button>
          </div>
        )}
        <div className="hero__content-centered">
          {heroData.hero_logo_url && (
            <img src={heroData.hero_logo_url} alt="Logo" className="hero__logo mb-4" />
          )}
          <h1 className="hero__title">{heroData.hero_title || 'Welcome'}</h1>
          <p className="hero__text">{heroData.hero_text || 'Your perfect getaway awaits'}</p>
          {heroData.hero_image_url && (
            <div className="hero__image-below mt-4">
              <img src={heroData.hero_image_url} alt={heroData.hero_title || 'Hero'} />
            </div>
          )}
        </div>
      </Container>
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
