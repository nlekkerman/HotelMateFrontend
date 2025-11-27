import React from 'react';
import { Row, Col } from 'react-bootstrap';

/**
 * FooterSectionPreset - Renders footer section based on numeric style_variant (1-5)
 * 
 * Preset 1: Simple centered (Clean & Modern)
 * Preset 2: 3-column dark (Dark & Elegant)
 * Preset 3: Minimal single line (Minimal & Sleek)
 * Preset 4: Colorful boxes (Vibrant & Playful)
 * Preset 5: Structured 4-column (Professional & Structured)
 */
const FooterSectionPreset = ({ section, hotel }) => {
  const variant = section?.style_variant ?? 1; // Default to Preset 1
  const footerData = section?.footer_data || {};
  
  // Use hotel data if footer_data is not available
  const hotelName = footerData.name || hotel?.name || 'Hotel';
  const hotelCity = footerData.city || hotel?.city || '';
  const hotelCountry = footerData.country || hotel?.country || '';
  const hotelEmail = footerData.email || hotel?.email || '';
  const hotelPhone = footerData.phone || hotel?.phone || '';

  // Preset 1: Clean & Modern - Simple centered
  if (variant === 1) {
    return (
      <footer className={`footer footer--preset-1 ${section?.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="footer__content-centered">
            <h5 className={`footer__hotel-name font-preset-${variant}-heading`}>{hotelName}</h5>
            {(hotelCity || hotelCountry) && (
              <p className={`footer__location font-preset-${variant}-body`}>
                {hotelCity}{hotelCity && hotelCountry ? ', ' : ''}{hotelCountry}
              </p>
            )}
            <p className={`footer__copyright font-preset-${variant}-body`}>
              &copy; {new Date().getFullYear()} {hotelName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Preset 2: Dark & Elegant - 3-column dark
  if (variant === 2) {
    return (
      <footer className={`footer footer--preset-2 ${section?.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <Row className="g-4">
            <Col xs={12} md={4}>
              <h5 className={`footer__section-title font-preset-${variant}-heading`}>{hotelName}</h5>
              {(hotelCity || hotelCountry) && (
                <p className={`footer__text font-preset-${variant}-body`}>
                  {hotelCity}{hotelCity && hotelCountry ? ', ' : ''}{hotelCountry}
                </p>
              )}
            </Col>
            <Col xs={12} md={4}>
              <h6 className={`footer__section-title font-preset-${variant}-subtitle`}>Contact</h6>
              {hotelEmail && <p className={`footer__text font-preset-${variant}-body`}>{hotelEmail}</p>}
              {hotelPhone && <p className={`footer__text font-preset-${variant}-body`}>{hotelPhone}</p>}
            </Col>
            <Col xs={12} md={4}>
              <h6 className={`footer__section-title font-preset-${variant}-subtitle`}>Follow Us</h6>
              <div className="footer__social-links">
                <a href="#" className="footer__social-link"><i className="bi bi-facebook"></i></a>
                <a href="#" className="footer__social-link"><i className="bi bi-instagram"></i></a>
                <a href="#" className="footer__social-link"><i className="bi bi-twitter"></i></a>
              </div>
            </Col>
          </Row>
          <div className="footer__bottom">
            <p className={`footer__copyright font-preset-${variant}-body`}>
              &copy; {new Date().getFullYear()} {hotelName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Preset 3: Minimal & Sleek - Single line
  if (variant === 3) {
    return (
      <footer className={`footer footer--preset-3 ${section?.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className="footer__minimal">
            <span className={`footer__minimal-text font-preset-${variant}-body`}>
              {hotelName} {hotelCity && `• ${hotelCity}`}
            </span>
            <span className={`footer__minimal-divider font-preset-${variant}-body`}>|</span>
            <span className={`footer__minimal-copyright font-preset-${variant}-body`}>
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    );
  }

  // Preset 4: Vibrant & Playful - Colorful boxes
  if (variant === 4) {
    return (
      <footer className={`footer footer--preset-4 ${section?.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <Row className="g-4">
            <Col xs={12} sm={6} md={3}>
              <div className="footer__box footer__box--1">
                <i className="bi bi-building footer__box-icon"></i>
                <h6 className={`footer__box-title font-preset-${variant}-heading`}>{hotelName}</h6>
              </div>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <div className="footer__box footer__box--2">
                <i className="bi bi-geo-alt footer__box-icon"></i>
                <p className={`footer__box-text font-preset-${variant}-body`}>{hotelCity || 'Location'}</p>
              </div>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <div className="footer__box footer__box--3">
                <i className="bi bi-envelope footer__box-icon"></i>
                <p className={`footer__box-text font-preset-${variant}-body`}>{hotelEmail || 'Contact'}</p>
              </div>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <div className="footer__box footer__box--4">
                <i className="bi bi-telephone footer__box-icon"></i>
                <p className={`footer__box-text font-preset-${variant}-body`}>{hotelPhone || 'Phone'}</p>
              </div>
            </Col>
          </Row>
          <div className="footer__bottom-colorful">
            <p className={`footer__copyright font-preset-${variant}-body`}>
              © {new Date().getFullYear()} {hotelName}
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Preset 5: Professional & Structured - 4-column structured
  if (variant === 5) {
    return (
      <footer className={`footer footer--preset-5 ${section?.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <Row className="g-4">
            <Col xs={12} md={3}>
              <h6 className={`footer__heading font-preset-${variant}-heading`}>About</h6>
              <p className={`footer__text font-preset-${variant}-body`}>{hotelName}</p>
              {(hotelCity || hotelCountry) && (
                <p className={`footer__text-small font-preset-${variant}-body`}>
                  {hotelCity}{hotelCity && hotelCountry ? ', ' : ''}{hotelCountry}
                </p>
              )}
            </Col>
            <Col xs={12} md={3}>
              <h6 className={`footer__heading font-preset-${variant}-heading`}>Quick Links</h6>
              <ul className="footer__links">
                <li><a href="#" className={`footer__link font-preset-${variant}-body`}>Home</a></li>
                <li><a href="#" className={`footer__link font-preset-${variant}-body`}>Rooms</a></li>
                <li><a href="#" className={`footer__link font-preset-${variant}-body`}>Facilities</a></li>
                <li><a href="#" className={`footer__link font-preset-${variant}-body`}>Contact</a></li>
              </ul>
            </Col>
            <Col xs={12} md={3}>
              <h6 className={`footer__heading font-preset-${variant}-heading`}>Contact</h6>
              {hotelEmail && (
                <p className={`footer__text-small font-preset-${variant}-body`}>
                  <i className="bi bi-envelope me-2"></i>{hotelEmail}
                </p>
              )}
              {hotelPhone && (
                <p className={`footer__text-small font-preset-${variant}-body`}>
                  <i className="bi bi-telephone me-2"></i>{hotelPhone}
                </p>
              )}
            </Col>
            <Col xs={12} md={3}>
              <h6 className={`footer__heading font-preset-${variant}-heading`}>Connect</h6>
              <div className="footer__social-structured">
                <a href="#" className="footer__social-btn"><i className="bi bi-facebook"></i></a>
                <a href="#" className="footer__social-btn"><i className="bi bi-instagram"></i></a>
                <a href="#" className="footer__social-btn"><i className="bi bi-twitter"></i></a>
                <a href="#" className="footer__social-btn"><i className="bi bi-linkedin"></i></a>
              </div>
            </Col>
          </Row>
          <div className="footer__bottom-structured">
            <p className={`footer__copyright-small font-preset-${variant}-body`}>
              &copy; {new Date().getFullYear()} {hotelName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Fallback to Preset 1
  return (
    <footer className={`footer footer--preset-1 ${section?.is_active === false ? 'section-inactive' : ''}`}>
      <div className="section-container">
        <div className="footer__content-centered">
          <h5 className={`footer__hotel-name font-preset-1-heading`}>{hotelName}</h5>
          {(hotelCity || hotelCountry) && (
            <p className={`footer__location font-preset-1-body`}>
              {hotelCity}{hotelCity && hotelCountry ? ', ' : ''}{hotelCountry}
            </p>
          )}
          <p className={`footer__copyright font-preset-1-body`}>
            &copy; {new Date().getFullYear()} {hotelName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSectionPreset;
