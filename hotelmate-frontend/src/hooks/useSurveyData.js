import { useState, useEffect } from 'react';
import { publicAPI } from '@/services/api';

/**
 * useSurveyData Hook
 * 
 * Mirrors usePrecheckinData.js patterns exactly for survey functionality
 * Handles token validation, data loading, and state management
 */
export const useSurveyData = (hotelSlug, token) => {
  // State management - Mirror pre-check-in patterns
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surveyState, setSurveyState] = useState('loading'); // loading|invalid|expired|completed|ready
  
  // Data states
  const [surveyConfig, setSurveyConfig] = useState({ enabled: {}, required: {} });
  const [fieldRegistry, setFieldRegistry] = useState({});
  const [booking, setBooking] = useState(null);
  const [preset, setPreset] = useState('default');

  // Helper function to unwrap API responses - Mirror pre-check-in pattern
  const unwrap = (response) => {
    if (response?.data) {
      return response.data;
    }
    return response || {};
  };

  // Load survey data on mount
  useEffect(() => {
    const loadSurveyData = async () => {
      if (!token) {
        setError('Missing survey token. Please use the link provided in your email.');
        setSurveyState('invalid');
        setLoading(false);
        return;
      }

      if (!hotelSlug) {
        setError('Hotel information not found. Please check your link.');
        setSurveyState('invalid');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setSurveyState('loading');
        
        const response = await publicAPI.get(
          `/hotel/${hotelSlug}/survey/?token=${encodeURIComponent(token)}`
        );
        
        const data = unwrap(response);
        
        // Handle different survey states
        let determinedState = 'ready'; // Default to ready
        
        // Check if survey is already submitted
        if (data.survey_already_submitted === true) {
          setSurveyState('completed');
          return;
        }
        
        // If we have data and survey not submitted, we're ready
        if (data.survey_config && data.survey_field_registry) {
          determinedState = 'ready';
        }
        
        // Handle survey_state from backend if provided, otherwise use determined state
        const finalState = data.survey_state || determinedState;
        setSurveyState(finalState);
        
        if (finalState === 'invalid') {
          setError('Invalid or malformed survey link. Please contact the hotel for assistance.');
          return;
        }
        
        if (finalState === 'expired') {
          setError('This survey link has expired. Please contact the hotel if you still wish to provide feedback.');
          return;
        }
        
        if (finalState === 'completed') {
          // Token already used - show success state but don't allow resubmission
          setSurveyState('completed');
          return;
        }
        
        // Process data for ready state
        if (finalState === 'ready') {
          // Survey configuration (snapshot at send time)
          setSurveyConfig({
            enabled: data.survey_config?.enabled || {},
            required: data.survey_config?.required || {}
          });
          
          // Field registry for dynamic rendering - Handle both possible key names
          setFieldRegistry(data.field_registry || data.survey_field_registry || {});
          
          // Booking context
          setBooking(data.booking || {});
          
          // Theme preset
          setPreset(data.preset || 'default');
          
          console.log('Survey data loaded successfully:', {
            survey_state: finalState,
            config: data.survey_config,
            registry: data.field_registry || data.survey_field_registry,
            booking: data.booking
          });
        }
        
      } catch (err) {
        console.error('Failed to load survey data:', err);
        
        // Handle specific error responses
        if (err.response?.status === 401) {
          setError('Invalid or expired survey link. Please contact the hotel for a new link.');
          setSurveyState('invalid');
        } else if (err.response?.status === 410) {
          setError('This survey link has expired. Please contact the hotel if you still wish to provide feedback.');
          setSurveyState('expired');
        } else if (err.response?.status === 409) {
          setError('This survey has already been completed. Thank you for your feedback!');
          setSurveyState('completed');
        } else {
          setError('Failed to load survey information. Please try again later or contact the hotel.');
          setSurveyState('invalid');
        }
        
      } finally {
        setLoading(false);
      }
    };

    if (hotelSlug && token) {
      loadSurveyData();
    }
  }, [hotelSlug, token]);

  // Return hook interface - Mirror pre-check-in pattern
  return {
    // Loading states
    loading,
    error,
    surveyState,
    
    // Data
    surveyConfig,
    fieldRegistry, 
    booking,
    preset,
    
    // Computed values
    hotelName: booking?.hotel_name || '',
    checkInDate: booking?.check_in_date || '',
    checkOutDate: booking?.check_out_date || '',
    
    // Helper for components
    isReady: surveyState === 'ready',
    isCompleted: surveyState === 'completed',
    isInvalid: surveyState === 'invalid',
    isExpired: surveyState === 'expired'
  };
};