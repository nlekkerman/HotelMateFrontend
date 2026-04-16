import React from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { usePublicPagePermissions } from '@/hooks/usePublicPagePermissions';
import { usePreset } from '@/hooks/usePreset';
import SectionHeader from './SectionHeader';
import RoomCard from './RoomCard';
import '@/styles/sections.css';

/**
 * RoomsSectionView - Public view for rooms section (auto-populated from PMS)
 * Displays all active room types with booking CTAs
 * Follows the API guide structure from /api/public/hotel/{slug}/page/
 */
const RoomsSectionView = ({ section }) => {
  const { slug } = useParams();
  const { canEditPublicPage } = usePublicPagePermissions(slug);
  
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
  
  // Extract room types following the API guide structure
  
  const roomsData = section.rooms_data || {};
  let roomTypes = roomsData.room_types || [];
  
  // Check if we have the API guide structure (already processed room types)
  const isApiGuideStructure = roomTypes.length > 0 && roomTypes[0]?.starting_price_from;
  
  if (!isApiGuideStructure && roomTypes.length === 0) {
    
    // Check if room types are in element data
    if (section.element?.rooms_data?.room_types) {
      roomTypes = section.element.rooms_data.room_types;
    }
    // Check if room types are directly in element
    else if (section.element?.room_types) {
      roomTypes = section.element.room_types;
    }
    // Check if there's a different rooms property
    else if (section.rooms) {
      roomTypes = section.rooms;
    }
  }
  
  // Process room data - handle both API guide format and current backend format
  const validRoomTypes = React.useMemo(() => {
    if (!roomTypes || roomTypes.length === 0) {
      return [];
    }

    // Check if this is the API guide format (room types already processed)
    const isApiGuideFormat = roomTypes[0]?.starting_price_from && !roomTypes[0]?.room_type_id;

    if (isApiGuideFormat) {
      // API Guide format - room types are already processed
      return roomTypes.map(room => ({
        id: room.id,
        code: room.code,
        name: room.name,
        short_description: room.short_description || 'Comfortable accommodation',
        max_occupancy: room.max_occupancy || 2,
        bed_setup: room.bed_setup || 'Standard bed',
        photo: room.photo || null,
        starting_price_from: room.starting_price_from || '89.00',
        currency: room.currency || 'EUR',
        availability_message: room.availability_message || 'Available',
        booking_cta_url: room.booking_cta_url || `/booking/${section.hotel_slug || 'hotel'}?room_type_code=${room.code}`
      }));
    } else {
      // Current backend format - group individual room instances by room_type_id
      const roomsByType = {};
      
      roomTypes.forEach((room, index) => {
        const typeId = room.room_type_id;
        
        // Check multiple possible price fields - current_price is the main field
        const priceValue = room.current_price || 
                          room.starting_price_from || 
                          room.price || 
                          room.base_price || 
                          room.rate || 
                          room.nightly_rate || 
                          room.price_per_night ||
                          '89.00'; // fallback price

        const currentPrice = parseFloat(priceValue);

        // If this room type doesn't exist yet, or this room has a lower price
        if (!roomsByType[typeId] || currentPrice < parseFloat(roomsByType[typeId].starting_price_from || 0)) {
          roomsByType[typeId] = {
            id: room.room_type_id,
            code: room.room_type_code || room.room_type_name,
            name: room.room_type_name,
            short_description: room.short_description || 'Comfortable accommodation',
            max_occupancy: room.max_occupancy || 2,
            bed_setup: room.bed_setup || 'Standard bed',
            photo: room.photo || room.image_url || null,
            starting_price_from: priceValue,
            currency: room.currency || 'EUR',
            availability_message: room.availability_message || 'Available',
            booking_cta_url: room.booking_cta_url || `/booking/${section.hotel_slug || 'hotel'}?room_type_code=${room.room_type_code}`
          };
        }
      });

      const uniqueRoomTypes = Object.values(roomsByType);

      return uniqueRoomTypes;
    }
  }, [roomTypes, section.hotel_slug]);
  
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

  // Empty state handling following API guide recommendations
  if (validRoomTypes.length === 0) {
    // Hide section for public users
    if (!canEditPublicPage) {
      return null;
    }
    
    // Show message for staff users
    return (
      <section className="rooms-section-view py-5">
        <Container>
          <SectionHeader
            title={section.element?.title || section.name || 'Our Rooms & Suites'}
            subtitle={section.element?.subtitle || roomsData.subtitle || 'Choose the perfect stay for your visit'}
            preset={headerPreset}
          />
          <Alert variant="info" className="text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <i className="bi bi-door-open fs-1 d-block mb-3"></i>
            <h5>No Active Room Types</h5>
            <p className="mb-0">
              No room types are available from <code>/api/public/hotel/{'{'}hotel-slug{'}'}/page/</code>. 
              Configure room types in the PMS system to display them here.
            </p>
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
          {validRoomTypes.map((room) => {
            return layout === 'list' ? (
              <div key={room.id} className="mb-4">
                <RoomCard room={room} preset={cardPreset} />
              </div>
            ) : (
              <Col key={room.id} className="mb-4">
                <RoomCard room={room} preset={cardPreset} />
              </Col>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RoomsSectionView;
