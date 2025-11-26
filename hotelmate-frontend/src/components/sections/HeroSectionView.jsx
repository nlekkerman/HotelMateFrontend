import React, { useState } from 'react';
import { Container, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { updateHeroSection, uploadHeroImage, uploadHeroLogo } from '@/services/sectionEditorApi';
import '@/styles/sections.css';

/**
 * HeroSectionView - Public view for hero section with inline editing
 */
const HeroSectionView = ({ section, hotel, onUpdate }) => {
  const { isStaff } = useAuth();
  const heroData = section.hero_data || {};
  
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
  
  return (
    <section 
      className="hero-section-view position-relative"
      style={{
        backgroundImage: heroData.hero_image_url ? `url(${heroData.hero_image_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: heroData.hero_image_url ? 'transparent' : '#f8f9fa',
      }}
    >
      {/* Overlay for better text readability */}
      {heroData.hero_image_url && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        />
      )}
      
      <Container className="position-relative" style={{ zIndex: 1 }}>
        {/* Staff Edit Button */}
        {isStaff && hotel && (
          <div className="text-end mb-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTitle(heroData.hero_title || '');
                setText(heroData.hero_text || '');
                setShowModal(true);
              }}
              className="shadow"
            >
              <i className="bi bi-pencil-square me-2"></i>
              Edit Hero
            </Button>
          </div>
        )}
        
        <div className="text-center">
          {heroData.hero_logo_url && (
            <img 
              src={heroData.hero_logo_url}
              alt="Logo"
              style={{
                maxWidth: '200px',
                maxHeight: '100px',
                marginBottom: '2rem',
              }}
            />
          )}
          
          <h1 
            className="display-3 fw-bold mb-4"
            style={{
              color: heroData.hero_image_url ? 'white' : '#333',
              textShadow: heroData.hero_image_url ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {heroData.hero_title || 'Welcome'}
          </h1>
          
          <p 
            className="lead"
            style={{
              color: heroData.hero_image_url ? 'white' : '#666',
              textShadow: heroData.hero_image_url ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none',
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            {heroData.hero_text || 'Your perfect getaway awaits'}
          </p>
        </div>
      </Container>

      {/* Edit Modal */}
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
    </section>
  );
};

export default HeroSectionView;
