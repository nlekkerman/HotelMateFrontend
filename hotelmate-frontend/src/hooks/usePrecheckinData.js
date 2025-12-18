import { useState, useEffect } from 'react';
import { publicAPI } from '@/services/api';

/**
 * Custom hook for fetching and normalizing precheckin data
 * Handles API calls, data transformation, and loading states
 */
export const usePrecheckinData = (hotelSlug, token) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [booker, setBooker] = useState(null);
  const [party, setParty] = useState(null);
  const [registry, setRegistry] = useState({});
  const [config, setConfig] = useState({ enabled: {}, required: {} });
  const [preset, setPreset] = useState(1);

  // Helper to safely unwrap API responses
  const unwrap = (res) => res?.data?.data ?? res?.data;

  // Normalize booker data from backend response
  const normalizeBookerData = (responseData) => {
    return {
      first_name: responseData.booker_first_name || '',
      last_name: responseData.booker_last_name || '',
      email: responseData.booker_email || responseData.primary_email || '',
      phone: responseData.booker_phone || responseData.primary_phone || ''
    };
  };

  // Normalize party data from backend response
  const normalizePartyData = (responseData) => {
    // Primary guest data - try multiple fallback sources
    const primary = {
      first_name: responseData.guest_first_name || responseData.booker_first_name || '',
      last_name: responseData.guest_last_name || responseData.booker_last_name || '',
      email: responseData.guest_email || responseData.booker_email || responseData.primary_email || '',
      phone: responseData.guest_phone || responseData.booker_phone || responseData.primary_phone || '',
      is_staying: true
    };
    
    // Extract companions from party structure
    const companions = responseData.party?.companions || [];
    
    return { primary, companions };
  };

  // Normalize booking data from backend response
  const normalizeBookingData = (responseData) => {
    return {
      id: responseData.id,
      booking_id: responseData.booking_id,
      adults: responseData.adults || 1,
      children: responseData.children || 0,
      check_in: responseData.check_in,
      check_out: responseData.check_out,
      room_type: responseData.room_type_name,
      hotel_preset: responseData.hotel_preset || 1
    };
  };

  useEffect(() => {
    const loadPrecheckinData = async () => {
      if (!token) {
        setError('Missing precheckin token. Please use the link provided in your email.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await publicAPI.get(
          `/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`
        );
        
        const data = unwrap(response);
        console.log('Precheckin API response data:', data);
        
        // Extract configuration
        const {
          precheckin_config = {},
          precheckin_field_registry = {},
          booking: bookingData = null,
          party: partyData = null,
          hotel: hotelData = null
        } = data;
        
        // Normalize and set data
        const normalizedBooking = bookingData ? normalizeBookingData(bookingData) : normalizeBookingData(data);
        const normalizedBooker = normalizeBookerData(data);
        const normalizedParty = normalizePartyData(data);
        
        setBooking(normalizedBooking);
        setBooker(normalizedBooker);
        setParty(normalizedParty);
        setRegistry(precheckin_field_registry);
        setConfig({
          enabled: precheckin_config.enabled || {},
          required: precheckin_config.required || {}
        });
        
        // Set theme from hotel/booking data
        if (normalizedBooking.hotel_preset) {
          setPreset(normalizedBooking.hotel_preset);
        } else if (hotelData) {
          const hotelPreset = hotelData.preset || hotelData.public_settings?.preset || hotelData.global_style_variant || 1;
          setPreset(hotelPreset);
        }
        
      } catch (err) {
        console.error('Failed to load precheckin data:', err);
        if (err.response?.status === 401) {
          setError('Invalid or expired precheckin link. Please contact the hotel for a new link.');
        } else {
          setError('Failed to load precheckin information. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (hotelSlug) {
      loadPrecheckinData();
    }
  }, [hotelSlug, token]);

  return {
    loading,
    error,
    booking,
    booker,
    party,
    registry,
    config,
    preset
  };
};