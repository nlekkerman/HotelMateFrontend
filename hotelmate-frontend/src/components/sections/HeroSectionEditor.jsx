import React, { useState } from 'react';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { updateHeroSection, uploadHeroImage, uploadHeroLogo } from '@/services/sectionEditorApi';

/**
 * HeroSectionEditor - Edit hero section with title, text, and images
 */
const HeroSectionEditor = ({ section, hotelSlug, onUpdate }) => {
  const heroData = section.hero_data || {};
  
  const [title, setTitle] = useState(heroData.hero_title || '');
  const [text, setText] = useState(heroData.hero_text || '');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleSaveText = async () => {
    if (!heroData.id) {
      toast.error('Hero section not initialized');
      return;
    }

    try {
      setSaving(true);
      await updateHeroSection(hotelSlug, heroData.id, {
        hero_title: title,
        hero_text: text,
      });
      toast.success('Hero text updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to update hero text:', error);
      toast.error('Failed to update hero text');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !heroData.id) return;

    try {
      setUploadingImage(true);
      await uploadHeroImage(hotelSlug, heroData.id, file);
      toast.success('Hero image uploaded successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to upload hero image:', error);
      toast.error('Failed to upload hero image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !heroData.id) return;

    try {
      setUploadingLogo(true);
      await uploadHeroLogo(hotelSlug, heroData.id, file);
      toast.success('Logo uploaded successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <Card className="mb-3">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-star me-2"></i>
          Hero Section
        </h5>
      </Card.Header>
      <Card.Body>
        {/* Title */}
        <Form.Group className="mb-3">
          <Form.Label>Hero Title</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter hero title"
          />
        </Form.Group>

        {/* Text */}
        <Form.Group className="mb-3">
          <Form.Label>Hero Text</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter hero description"
          />
        </Form.Group>

        <Button
          variant="primary"
          onClick={handleSaveText}
          disabled={saving}
          className="mb-4"
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-save me-2"></i>
              Save Text
            </>
          )}
        </Button>

        <hr />

        {/* Hero Image */}
        <div className="mb-3">
          <Form.Label>Hero Background Image</Form.Label>
          {heroData.hero_image_url && (
            <div className="mb-2">
              <img
                src={heroData.hero_image_url}
                alt="Hero"
                style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }}
                className="rounded"
              />
            </div>
          )}
          <Form.Control
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploadingImage}
          />
          {uploadingImage && (
            <div className="mt-2">
              <Spinner animation="border" size="sm" className="me-2" />
              Uploading image...
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="mb-3">
          <Form.Label>Hero Logo</Form.Label>
          {heroData.hero_logo_url && (
            <div className="mb-2">
              <img
                src={heroData.hero_logo_url}
                alt="Logo"
                style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
                className="rounded"
              />
            </div>
          )}
          <Form.Control
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
          />
          {uploadingLogo && (
            <div className="mt-2">
              <Spinner animation="border" size="sm" className="me-2" />
              Uploading logo...
            </div>
          )}
        </div>

        <Alert variant="info" className="mb-0">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Tip:</strong> Use high-quality images (JPEG, PNG, WebP). Max size: 10MB.
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default HeroSectionEditor;
