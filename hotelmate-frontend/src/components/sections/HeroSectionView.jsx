import React from 'react';
import { Container } from 'react-bootstrap';
import '@/styles/sections.css';

/**
 * HeroSectionView - Public view for hero section
 */
const HeroSectionView = ({ section }) => {
  const heroData = section.hero_data || {};
  
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
    </section>
  );
};

export default HeroSectionView;
