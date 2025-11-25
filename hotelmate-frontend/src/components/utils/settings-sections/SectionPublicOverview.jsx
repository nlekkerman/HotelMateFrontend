import React from "react";
import { Card, Button } from "react-bootstrap";

export default function SectionPublicOverview({ hotelSlug, formData, settings }) {
  console.log('[SectionPublicOverview] ⭐ RAW settings object:', settings);
  console.log('[SectionPublicOverview] ⭐ settings.hero_image:', settings?.hero_image);
  console.log('[SectionPublicOverview] ⭐ settings.hero_image_display:', settings?.hero_image_display);
  console.log('[SectionPublicOverview] ⭐ FULL formData object:', formData);
  console.log('[SectionPublicOverview] ⭐ formData.hero_image value:', formData?.hero_image);
  console.log('[SectionPublicOverview] ⭐ typeof hero_image:', typeof formData?.hero_image);
  console.log('[SectionPublicOverview] ⭐ hero_image length:', formData?.hero_image?.length);
  console.log('[SectionPublicOverview] ⭐ Is falsy?', !formData?.hero_image);
  
  const publicUrl = `${window.location.origin}/${hotelSlug}`;
  // Try formData first, fallback to settings display fields if formData is empty
  const heroImageUrl = formData?.hero_image || settings?.hero_image_display || settings?.hero_image;
  const welcomeMsg = formData?.welcome_message || settings?.welcome_message;
  
  console.log('[SectionPublicOverview] ⭐ Final heroImageUrl to display:', heroImageUrl);
  console.log('[SectionPublicOverview] ⭐ Final welcomeMsg to display:', welcomeMsg);
  
  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h4 className="mb-1">
              <i className="bi bi-globe me-2"></i>
              Public Page Overview
            </h4>
            <p className="text-muted mb-0">
              Quick snapshot of your hotel's public page
            </p>
          </div>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => window.open(publicUrl, '_blank')}
          >
            <i className="bi bi-eye me-2"></i>
            Preview
          </Button>
        </div>
        
        <hr className="my-3" />
        
        <div className="row g-3">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label fw-bold small text-muted">PUBLIC URL</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={publicUrl}
                  readOnly
                />
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                >
                  <i className="bi bi-clipboard"></i>
                </Button>
              </div>
            </div>
            
            <div className="mb-3">
              <label className="form-label fw-bold small text-muted">PUBLIC STATUS</label>
              <div>
                <span className="badge bg-success">
                  <i className="bi bi-check-circle me-1"></i>
                  Active
                </span>
              </div>
            </div>
            
            <div>
              <label className="form-label fw-bold small text-muted">WELCOME MESSAGE</label>
              <p className="mb-0 text-truncate" style={{ maxWidth: '400px' }}>
                {welcomeMsg || 'No welcome message set'}
              </p>
            </div>
          </div>
          
          <div className="col-md-6">
            <label className="form-label fw-bold small text-muted">HERO IMAGE</label>
            {heroImageUrl && heroImageUrl.trim() !== '' ? (
              <div>
                <p className="small text-muted mb-1">URL: {heroImageUrl}</p>
                <img
                  src={heroImageUrl}
                  alt="Hero"
                  className="img-fluid rounded"
                  style={{ maxHeight: '150px', width: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    console.error('[SectionPublicOverview] ❌ Image failed to load:', heroImageUrl);
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                  onLoad={() => {
                    console.log('[SectionPublicOverview] ✅ Image loaded successfully:', heroImageUrl);
                  }}
                />
                <div 
                  className="bg-light rounded align-items-center justify-content-center" 
                  style={{ height: '150px', display: 'none' }}
                >
                  <span className="text-danger">Image failed to load</span>
                </div>
              </div>
            ) : (
              <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ height: '150px' }}>
                <span className="text-muted">No hero image set</span>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
