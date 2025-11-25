import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * HeroSection - Modern full-viewport hero with parallax and animations
 * Uses theme colors from staff settings
 */
const HeroSection = ({ hotel, settings }) => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [hasBookings, setHasBookings] = useState(false);
  const { scrollY } = useScroll();
  
  // Parallax effect for background
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    setMounted(true);
    
    // Check if user has any bookings in localStorage
    const bookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
    setHasBookings(bookings.length > 0);
  }, []);

  if (!hotel) return null;

  const {
    hero_image_url,
    logo_url,
    name,
    tagline,
    short_description,
    booking_options,
    contact,
    slug,
  } = hotel;

  // Use settings data if available, fallback to hotel data
  const heroImage = settings?.hero_image || hero_image_url;
  const welcomeMessage = settings?.welcome_message;
  const displayDescription = settings?.short_description || short_description;

  const primaryCtaLabel = booking_options?.primary_cta_label || 'Book Your Stay';
  const secondaryCtaPhone = booking_options?.secondary_cta_phone;

  const handleBookNow = () => {
    navigate(`/${slug}/book`);
  };

  return (
    <section className="modern-hero-section">
      {/* Parallax Background */}
      <motion.div 
        className="modern-hero-background"
        style={{ y: mounted ? y : 0 }}
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={name}
            loading="eager"
            onError={(e) => {
              console.error('Hero image failed to load:', heroImage);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          />
        )}
      </motion.div>

      {/* Gradient Overlay */}
      <div className="modern-hero-overlay" />

      {/* Content */}
      <motion.div 
        className="modern-hero-content"
        style={{ opacity: mounted ? opacity : 1 }}
      >
        <Container>
          <div className="text-center">
            {/* Animated Logo */}
            {logo_url && (
              <motion.img
                src={logo_url}
                alt={`${name} logo`}
                className="modern-hero-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                onError={(e) => {
                  console.error('Logo failed to load:', logo_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

            {/* Animated Hotel Name */}
            <motion.h1
              className="modern-hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {name}
            </motion.h1>

            {/* Animated Tagline */}
            {tagline && (
              <motion.h2
                className="modern-hero-tagline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {tagline}
              </motion.h2>
            )}

            {/* Welcome Message */}
            {welcomeMessage && (
              <motion.p
                className="modern-hero-description"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                style={{ fontWeight: '500', fontSize: '1.1rem' }}
              >
                {welcomeMessage}
              </motion.p>
            )}

            {/* Animated Description */}
            {displayDescription && (
              <motion.p
                className="modern-hero-description"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {displayDescription}
              </motion.p>
            )}

            {/* Animated CTAs */}
            <motion.div
              className="modern-hero-cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <button
                className="hero-btn-primary"
                onClick={handleBookNow}
              >
                <i className="bi bi-calendar-check"></i>
                {primaryCtaLabel}
              </button>

              {hasBookings && (
                <button
                  className="hero-btn-outline"
                  onClick={() => navigate(`/${slug}/my-bookings`)}
                >
                  <i className="bi bi-clipboard-check"></i>
                  My Bookings
                </button>
              )}

              {secondaryCtaPhone && (
                <a
                  href={`tel:${secondaryCtaPhone}`}
                  className="hero-btn-secondary"
                >
                  <i className="bi bi-telephone"></i>
                  Call Us: {secondaryCtaPhone}
                </a>
              )}
            </motion.div>
          </div>
        </Container>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="hero-scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <i className="bi bi-chevron-down" style={{ fontSize: '2rem' }}></i>
      </motion.div>
    </section>
  );
};

export default HeroSection;
