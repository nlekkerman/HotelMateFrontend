import React from 'react';
import PropTypes from 'prop-types';

const HeroSection = ({ element, hotel }) => {
  const { title, subtitle, body, image_url, settings = {} } = element;
  const { 
    primary_cta_label, 
    primary_cta_url, 
    align = 'center',
    show_logo = true,
    logo_url,
    overlay_opacity = 0.4,
    text_color = 'white'
  } = settings;

  // Use settings logo or fall back to hotel logo
  const displayLogo = logo_url || hotel?.logo_url;

  return (
    <section 
      className="hero-section position-relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, ${overlay_opacity}), rgba(0, 0, 0, ${overlay_opacity})), url(${image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: text_color,
        textAlign: align,
      }}
    >
      <div className="container">
        <div className={`hero-content align-${align}`} style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Logo */}
          {show_logo && displayLogo && (
            <div className="mb-4 d-flex justify-content-center">
              <img 
                src={displayLogo} 
                alt={hotel?.name || 'Hotel Logo'} 
                style={{ 
                  maxHeight: '120px', 
                  maxWidth: '300px',
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}

          {title && (
            <h1 className="display-3 fw-bold mb-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {title}
            </h1>
          )}
          
          {subtitle && (
            <h2 className="h3 mb-4" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
              {subtitle}
            </h2>
          )}
          
          {body && (
            <p className="lead mb-4" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              {body}
            </p>
          )}
          
          {primary_cta_label && primary_cta_url && (
            <a 
              href={primary_cta_url} 
              className="btn btn-primary btn-lg px-5 py-3"
              style={{ 
                fontSize: '1.2rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}
            >
              {primary_cta_label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

HeroSection.propTypes = {
  element: PropTypes.shape({
    title: PropTypes.string,
    subtitle: PropTypes.string,
    body: PropTypes.string,
    image_url: PropTypes.string,
    settings: PropTypes.shape({
      primary_cta_label: PropTypes.string,
      primary_cta_url: PropTypes.string,
      align: PropTypes.oneOf(['left', 'center', 'right']),
      show_logo: PropTypes.bool,
      logo_url: PropTypes.string,
      overlay_opacity: PropTypes.number,
      text_color: PropTypes.string,
    }),
  }).isRequired,
  hotel: PropTypes.shape({
    name: PropTypes.string,
    logo_url: PropTypes.string,
  }),
};

export default HeroSection;
