import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatFromPrice } from '@/utils/formatCurrency';

/**
 * RoomTypesSection - Modern room display with cards and animations
 * Uses theme colors from staff settings
 */
const RoomTypesSection = ({ hotel }) => {
  const navigate = useNavigate();
  const roomTypes = hotel?.room_types || [];

  if (roomTypes.length === 0) return null;

  const handleBookRoom = (roomCode) => {
    navigate(`/${hotel.slug}/book?room=${roomCode}`);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="modern-room-section">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-heading mb-3">Rooms & Suites</h2>
          <p className="section-subheading">
            Choose from our selection of beautifully designed accommodations
          </p>
        </motion.div>

        {/* Room Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <Row xs={1} md={2} lg={3} className="g-4">
            {roomTypes.map((room, index) => (
              <Col key={room.id || room.code || `room-${index}`}>
                <motion.div
                  className="modern-room-card"
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Room Image */}
                  <div className="modern-room-image">
                    {room.photo_url || room.photo ? (
                      <img
                        src={room.photo_url || room.photo}
                        alt={room.name}
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to sample hotel room image
                          e.currentTarget.src = `https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800`;
                        }}
                      />
                    ) : (
                      <img
                        src={`https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800`}
                        alt={room.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    )}

                    {/* Availability Badge */}
                    {room.availability_message && (
                      <div className="modern-room-badge">
                        {room.availability_message}
                      </div>
                    )}
                  </div>

                  {/* Room Content */}
                  <div className="modern-room-content">
                    <h3 className="modern-room-title">{room.name}</h3>

                    {room.short_description && (
                      <p className="modern-room-description">
                        {room.short_description}
                      </p>
                    )}

                    {/* Room Details */}
                    <div className="modern-room-details">
                      {room.max_occupancy && (
                        <div className="modern-room-detail-item">
                          <i className="bi bi-people"></i>
                          <span>
                            Up to {room.max_occupancy} {room.max_occupancy === 1 ? 'guest' : 'guests'}
                          </span>
                        </div>
                      )}
                      {room.bed_setup && (
                        <div className="modern-room-detail-item">
                          <i className="bi bi-moon"></i>
                          <span>{room.bed_setup}</span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    {room.starting_price_from && (
                      <div className="modern-room-price">
                        <span className="modern-room-price-amount">
                          {formatFromPrice(room.starting_price_from, room.currency)}
                        </span>
                        <span className="modern-room-price-period">per night</span>
                      </div>
                    )}

                    {/* Book Button */}
                    <button
                      className="modern-room-cta"
                      onClick={() => handleBookRoom(room.code)}
                    >
                      <i className="bi bi-calendar-check"></i>
                      Book this room
                    </button>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.div>
      </div>
    </section>
  );
};

export default RoomTypesSection;
