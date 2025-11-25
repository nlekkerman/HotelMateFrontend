import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Pusher from 'pusher-js';

/**
 * OffersSection - Modern display of special offers and packages
 * Uses theme colors from staff settings
 * Real-time updates via Pusher
 */
const OffersSection = ({ hotel, onRefreshNeeded }) => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);

  // Update local state when hotel prop changes - ONLY show active offers on public page
  useEffect(() => {
    const activeOffers = (hotel?.offers || []).filter(offer => offer.is_active === true);
    setOffers(activeOffers);
  }, [hotel?.offers]);



  // Pusher real-time updates
  useEffect(() => {
    if (!hotel?.slug) return;

    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe(`hotel-${hotel.slug}`);

    // Listen for new offer creation
    channel.bind('offer-created', (data) => {
      setOffers(prevOffers => {
        // Avoid duplicates
        const exists = prevOffers.some(o => o.id === data.offer.id);
        if (exists) return prevOffers;
        
        // Only add active offers to public page
        if (data.offer?.is_active) {
          return [data.offer, ...prevOffers];
        }
        return prevOffers;
      });
    });

    // Listen for offer updates
    channel.bind('offer-updated', (data) => {
      setOffers(prevOffers => {
        const offerExists = prevOffers.some(o => o.id === data.offer.id);
        
        // If offer became inactive, remove it from public view
        if (!data.offer?.is_active && offerExists) {
          return prevOffers.filter(o => o.id !== data.offer.id);
        }
        
        // If offer became active, add it
        if (data.offer?.is_active && !offerExists) {
          return [data.offer, ...prevOffers];
        }
        
        // If offer is active and exists, update it
        if (data.offer?.is_active && offerExists) {
          return prevOffers.map(offer => {
            if (offer.id === data.offer.id) {
              // If photo_url changed, add cache buster
              const updatedOffer = { ...data.offer };
              if (updatedOffer.photo_url && updatedOffer.photo_url !== offer.photo_url) {
                updatedOffer.photo_url = `${updatedOffer.photo_url}?t=${Date.now()}`;
              }
              return updatedOffer;
            }
            return offer;
          });
        }
        
        return prevOffers;
      });
    });

    // Listen for offer deletion
    channel.bind('offer-deleted', (data) => {
      setOffers(prevOffers => 
        prevOffers.filter(offer => offer.id !== data.offer_id)
      );
    });

    // Listen for image updates
    channel.bind('offer-image-updated', (data) => {
      setOffers(prevOffers => 
        prevOffers.map(offer => 
          offer.id === data.offer_id 
            ? { ...offer, photo_url: `${data.photo_url}?t=${Date.now()}` }
            : offer
        )
      );
    });

    // Listen for generic offers-updated (fallback/refresh trigger)
    channel.bind('offers-updated', (data) => {
      // Trigger parent refresh to get updated offers
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`hotel-${hotel.slug}`);
      pusher.disconnect();
    };
  }, [hotel?.slug, onRefreshNeeded]);

  if (offers.length === 0) return null;

  const formatDateRange = (validFrom, validTo) => {
    if (!validFrom || !validTo) return null;

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const fromDate = new Date(validFrom).toLocaleDateString('en-US', options);
    const toDate = new Date(validTo).toLocaleDateString('en-US', options);

    return `${fromDate} - ${toDate}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="modern-offers-section">
      <Container>
        {/* Section Header */}
        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-heading mb-3">Special Offers & Packages</h2>
          <p className="section-subheading">
            Discover our exclusive deals and limited-time offers
          </p>
        </motion.div>

        {/* Offers Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <Row xs={1} md={2} className="g-4">
            {offers.map((offer) => (
              <Col key={offer.id}>
                <motion.div
                  className="modern-offer-card"
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                >
                  {/* Offer Image */}
                  <div className="modern-offer-image">
                    {offer.photo_url ? (
                      <img
                        src={offer.photo_url}
                        alt={offer.title}
                        key={offer.photo_url}
                        loading="lazy"
                        onError={(e) => {
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

                    {/* Offer Tag */}
                    {offer.tag && (
                      <div className="modern-offer-tag">{offer.tag}</div>
                    )}
                  </div>

                  {/* Offer Content */}
                  <div className="modern-offer-content">
                    <h3 className="modern-offer-title">{offer.title}</h3>

                    {offer.short_description && (
                      <p className="modern-room-description">
                        {offer.short_description}
                      </p>
                    )}

                    {/* Valid Dates */}
                    {formatDateRange(offer.valid_from, offer.valid_to) && (
                      <div className="modern-offer-dates">
                        <i className="bi bi-calendar-event"></i>
                        <span>{formatDateRange(offer.valid_from, offer.valid_to)}</span>
                      </div>
                    )}

                    {/* Book Button */}
                    <button
                      className="modern-room-cta mt-3"
                      onClick={() => navigate(`/${hotel.slug}/book`)}
                    >
                      <i className="bi bi-gift"></i>
                      Book This Offer
                    </button>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.div>
      </Container>
    </section>
  );
};

export default OffersSection;
