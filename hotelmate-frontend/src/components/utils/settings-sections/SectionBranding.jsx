import React, { useState } from "react";
import { Card, Form, Row, Col, Button, Spinner, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

export default function SectionBranding({ formData, onChange, hotelSlug }) {
  const queryClient = useQueryClient();
  const [savingBranding, setSavingBranding] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({
    hero_image: null,
    logo: null,
    favicon: null
  });
  const [previewUrls, setPreviewUrls] = useState({
    hero_image: null,
    logo: null,
    favicon: null
  });

  const handleFileSelect = (file, fieldName) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    // Store the file for later upload
    setSelectedFiles(prev => ({
      ...prev,
      [fieldName]: file
    }));

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrls(prev => ({
        ...prev,
        [fieldName]: reader.result
      }));
    };
    reader.readAsDataURL(file);

    toast.info(`${fieldName === 'hero_image' ? 'Hero image' : fieldName === 'logo' ? 'Logo' : 'Favicon'} selected - Click Save to upload`);
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const formDataToSend = new FormData();

      // Add image files if selected
      if (selectedFiles.hero_image) {
        formDataToSend.append('hero_image', selectedFiles.hero_image);
      }
      if (selectedFiles.logo) {
        formDataToSend.append('logo', selectedFiles.logo);
      }
      if (selectedFiles.favicon) {
        formDataToSend.append('favicon', selectedFiles.favicon);
      }

      // Add text fields (URL inputs and slogan)
      if (!selectedFiles.hero_image && formData.hero_image) {
        formDataToSend.append('hero_image_url', formData.hero_image);
      }
      if (!selectedFiles.logo && formData.logo) {
        formDataToSend.append('logo_url', formData.logo);
      }
      if (!selectedFiles.favicon && formData.favicon) {
        formDataToSend.append('favicon_url', formData.favicon);
      }
      formDataToSend.append('slogan', formData.slogan || '');

      console.log('[SectionBranding] 📤 Saving branding...');
      const response = await api.patch(`/staff/hotel/${hotelSlug}/settings/`, formDataToSend);
      console.log('[SectionBranding] ✅ Branding saved, response:', response.data);
      
      // Update form data with new URLs from response
      if (response.data.hero_image_display) {
        console.log('[SectionBranding] Updating hero_image:', response.data.hero_image_display);
        onChange('hero_image', response.data.hero_image_display);
      }
      if (response.data.logo_display) {
        console.log('[SectionBranding] Updating logo:', response.data.logo_display);
        onChange('logo', response.data.logo_display);
      }
      if (response.data.favicon) {
        console.log('[SectionBranding] Updating favicon:', response.data.favicon);
        onChange('favicon', response.data.favicon);
      }
      if (response.data.slogan) {
        console.log('[SectionBranding] Updating slogan:', response.data.slogan);
        onChange('slogan', response.data.slogan);
      }

      // Clear selected files and previews
      setSelectedFiles({
        hero_image: null,
        logo: null,
        favicon: null
      });
      setPreviewUrls({
        hero_image: null,
        logo: null,
        favicon: null
      });

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries(['hotelPublicSettings', hotelSlug]);
      console.log('[SectionBranding] 🔄 Invalidated settings query cache');

      toast.success('Branding saved successfully!');
    } catch (error) {
      console.error('[SectionBranding] ❌ Failed to save branding:', error);
      console.error('[SectionBranding] Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to save branding');
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-badge-tm me-2"></i>
          Branding
        </h4>
        <p className="text-muted mb-3">
          Upload your hotel's logo, hero image, and branding assets
        </p>
        
        <hr className="my-3" />
        
        <Form>
          {/* Hero Image Section */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Hero Image</Form.Label>
            <Form.Control
              type="url"
              placeholder="https://example.com/hero.jpg or select file below"
              value={formData.hero_image || ''}
              onChange={(e) => onChange('hero_image', e.target.value)}
              className="mb-2"
            />
            <div className="d-flex gap-2 align-items-center mb-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => document.getElementById('heroImageInput').click()}
              >
                <i className="bi bi-image me-2"></i>
                {selectedFiles.hero_image ? 'Change Image' : 'Select Image'}
              </Button>
              <Form.Text className="text-muted">
                Large banner image for your hotel's homepage
              </Form.Text>
            </div>
            <input
              id="heroImageInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files[0], 'hero_image')}
            />
            {(previewUrls.hero_image || formData.hero_image) && (
              <div className="mt-3 p-3 bg-light rounded">
                <img 
                  src={previewUrls.hero_image || formData.hero_image} 
                  alt="Hero preview" 
                  style={{ maxHeight: '200px', width: '100%', objectFit: 'cover', borderRadius: '8px' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="text-danger text-center p-3">
                  Failed to load image preview
                </div>
                {selectedFiles.hero_image && (
                  <div className="mt-2">
                    <Badge bg="info">
                      <i className="bi bi-clock me-1"></i>
                      New image ready to upload: {selectedFiles.hero_image.name}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </Form.Group>

          <hr className="my-3" />

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Logo</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={formData.logo || ''}
                  onChange={(e) => onChange('logo', e.target.value)}
                  className="mb-2"
                />
                <div className="d-flex gap-2 mb-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => document.getElementById('logoInput').click()}
                  >
                    <i className="bi bi-image me-2"></i>
                    {selectedFiles.logo ? 'Change Logo' : 'Select Logo'}
                  </Button>
                </div>
                <input
                  id="logoInput"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0], 'logo')}
                />
                <Form.Text className="text-muted">
                  Main logo for your hotel (recommended: transparent PNG)
                </Form.Text>
                {(previewUrls.logo || formData.logo) && (
                  <div className="mt-3 p-3 bg-light rounded text-center">
                    <img 
                      src={previewUrls.logo || formData.logo} 
                      alt="Logo preview" 
                      style={{ maxHeight: '80px', maxWidth: '100%' }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    {selectedFiles.logo && (
                      <div className="mt-2">
                        <Badge bg="info" className="small">
                          Ready to upload: {selectedFiles.logo.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Favicon</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com/favicon.ico"
                  value={formData.favicon || ''}
                  onChange={(e) => onChange('favicon', e.target.value)}
                  className="mb-2"
                />
                <div className="d-flex gap-2 mb-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => document.getElementById('faviconInput').click()}
                  >
                    <i className="bi bi-image me-2"></i>
                    {selectedFiles.favicon ? 'Change Favicon' : 'Select Favicon'}
                  </Button>
                </div>
                <input
                  id="faviconInput"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0], 'favicon')}
                />
                <Form.Text className="text-muted">
                  Small icon shown in browser tabs (16x16 or 32x32px)
                </Form.Text>
                {(previewUrls.favicon || formData.favicon) && (
                  <div className="mt-3 p-3 bg-light rounded text-center">
                    <img 
                      src={previewUrls.favicon || formData.favicon} 
                      alt="Favicon preview" 
                      style={{ height: '32px', width: '32px' }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    {selectedFiles.favicon && (
                      <div className="mt-2">
                        <Badge bg="info" className="small">
                          Ready to upload: {selectedFiles.favicon.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Slogan (Optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Your comfort is our priority"
              value={formData.slogan || ''}
              onChange={(e) => onChange('slogan', e.target.value)}
              maxLength={100}
            />
            <Form.Text className="text-muted">
              A catchy tagline for your hotel
            </Form.Text>
          </Form.Group>

          <div className="d-flex justify-content-end mt-4">
            <Button 
              variant="primary" 
              onClick={handleSaveBranding}
              disabled={savingBranding}
              size="lg"
            >
              {savingBranding ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check2 me-2"></i>
                  Save Branding
                </>
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
