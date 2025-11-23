import React from 'react';
import { Container, Button } from 'react-bootstrap';

/**
 * HeroSection - Full-width hero with hotel branding and booking CTAs
 */
const HeroSection = ({ hotel }) => {
  if (!hotel) return null;

  const {
    hero_image_url,
    logo_url,
    name,
    tagline,
    short_description,
    booking_options,
    contact,
  } = hotel;

  const primaryCtaLabel = booking_options?.primary_cta_label || 'Book a Room';
  const primaryCtaUrl = booking_options?.primary_cta_url || contact?.booking_url;
  const secondaryCtaPhone = booking_options?.secondary_cta_phone;
  const websiteUrl = contact?.website_url;

  return (
    <section className="hero-section">
      <div
        className="hero-background"
        style={{
          backgroundImage: hero_image_url ? `url(${hero_image_url})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="hero-overlay">
          <Container>
            <div className="hero-content text-center text-white">
              {logo_url && (
                <img
                  src={logo_url}
                  alt={name}
                  className="hero-logo mb-4"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '150px',
                    objectFit: 'contain',
                  }}
                />
              )}

              <h1 className="display-3 fw-bold mb-3">{name}</h1>

              {tagline && <h2 className="h4 fw-light mb-3">{tagline}</h2>}

              {short_description && (
                <p className="lead mb-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {short_description}
                </p>
              )}

              <div className="hero-cta-buttons d-flex flex-wrap justify-content-center gap-3 mt-4">
                {primaryCtaUrl && (
                  <Button
                    variant="light"
                    size="lg"
                    href={primaryCtaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 fw-bold"
                  >
                    <i className="bi bi-calendar-check me-2"></i>
                    {primaryCtaLabel}
                  </Button>
                )}

                {secondaryCtaPhone ? (
                  <Button
                    variant="outline-light"
                    size="lg"
                    href={`tel:${secondaryCtaPhone}`}
                    className="px-5 py-3 fw-bold"
                  >
                    <i className="bi bi-telephone me-2"></i>
                    Call to Book
                  </Button>
                ) : (
                  websiteUrl && (
                    <Button
                      variant="outline-light"
                      size="lg"
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 fw-bold"
                    >
                      <i className="bi bi-globe me-2"></i>
                      Visit Website
                    </Button>
                  )
                )}
              </div>
            </div>
          </Container>
        </div>
      </div>

      <style jsx>{`
        .hero-section {
          position: relative;
          width: 100%;
          min-height: 60vh;
        }

        .hero-background {
          height: 100%;
          width: 100%;
        }

        .hero-overlay {
          background: rgba(0, 0, 0, 0.4);
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 0;
        }

        @media (max-width: 768px) {
          .hero-overlay {
            min-height: 50vh;
            padding: 3rem 0;
          }

          .hero-logo {
            max-width: 150px !important;
          }

          .display-3 {
            font-size: 2.5rem !important;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
