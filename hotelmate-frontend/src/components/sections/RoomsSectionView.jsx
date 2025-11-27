import React from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import { usePreset } from '@/hooks/usePreset';
import SectionHeader from './SectionHeader';
import RoomCard from './RoomCard';
import '@/styles/sections.css';

/**
 * RoomsSectionView - Public view for rooms section (auto-populated from PMS)
 * Displays all active room types with booking CTAs
 * Now supports preset-based layouts and styling
 */
const RoomsSectionView = ({ section }) => {
  const { isStaff } = useAuth();
  
  // Get presets for section layout, header, and cards
  const sectionPreset = usePreset(
    section.style_variant,
    'section',
    'rooms'
  );
  
  const headerPreset = usePreset(
    section.header_style || 'header_centered',
    'section_header'
  );
  
  const cardPreset = usePreset(
    section.card_style || 'room_card_standard',
    'room_card'
  );
  
  // Backend structure: section.rooms_data.room_types
  const roomsData = section.rooms_data || {};
  const roomTypes = roomsData.room_types || [];
  
  // Extract section layout configuration
  const config = sectionPreset?.config || {};
  const { 
    layout = 'grid', 
    columns = 3, 
    gap = 'large',
    autoplay = false,
    show_dots = false,
    hover_effect = 'lift',
  } = config;

  // Empty state handling
  if (roomTypes.length === 0) {
    // Hide section for public users
    if (!isStaff) {
      return null;
    }
    
    // Show message for staff users
    return (
      <section className="rooms-section-view py-5">
        <Container>
          <SectionHeader
            title={section.name}
            subtitle={roomsData.subtitle}
            preset={headerPreset}
          />
          <Alert variant="info" className="text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <i className="bi bi-door-open fs-1 d-block mb-3"></i>
            <h5>No Active Room Types</h5>
            <p className="mb-0">No room types are currently available from the PMS system. Add room types in the PMS settings to display them here.</p>
          </Alert>
        </Container>
      </section>
    );
  }

  const getLayoutClass = () => {
  const gapSize = {
    'small': '3',
    'medium': '4',
    'large': '4',
    'extra_large': '5',
  }[gap] || '4';

  switch (layout) {
    case 'grid':
      // Center cards horizontally
      return `row justify-content-center row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-${gapSize}`;
    
    case 'list':
      return 'd-flex flex-column gap-4 justify-content-center';

    case 'carousel':
      return 'rooms-carousel';

    case 'luxury':
      // same centering logic
      return `row justify-content-center row-cols-1 row-cols-md-2 row-cols-lg-3 g-5`;

    default:
      return `row justify-content-center row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-${gapSize}`;
  }
};


  const containerClass = layout === 'list' ? '' : getLayoutClass();

  return (
    <section className={`rooms-section rooms-section--preset-${section.style_variant ?? 1}`}>
      <div className="section-container">
        <div className={`section-header section-header--preset-${section.style_variant ?? 1}`}>
          <div className="section-header__content">
            <h2 className={`section-header__title font-preset-${section.style_variant ?? 1}-heading`}>{section.name}</h2>
          </div>
        </div>
        
        <div className={containerClass}>
          {roomTypes.map((room) => (
            layout === 'list' ? (
              <div key={room.id} className="mb-4">
                <RoomCard room={room} preset={cardPreset} />
              </div>
            ) : (
              <Col key={room.id} className="mb-4">
                <RoomCard room={room} preset={cardPreset} />
              </Col>
            )
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoomsSectionView;
