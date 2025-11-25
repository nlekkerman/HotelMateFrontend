// src/components/utils/Settings.jsx
import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { useHotelPublicEditPermission } from "@/hooks/useHotelPublicEditPermission";
import useHotelTheme from "@/hooks/useHotelTheme";
import api from "@/services/api";

// Import section components
import SectionPublicOverview from "./settings-sections/SectionPublicOverview";
import SectionContent from "./settings-sections/SectionContent";
import SectionImages from "./settings-sections/SectionImages";
import SectionAmenities from "./settings-sections/SectionAmenities";
import SectionContact from "./settings-sections/SectionContact";
import SectionBranding from "./settings-sections/SectionBranding";
import SectionTheme from "./settings-sections/SectionTheme";
import SectionStaffRegistration from "./settings-sections/SectionStaffRegistration";
import SectionRooms from "./settings-sections/SectionRooms";
import SectionOffers from "./settings-sections/SectionOffers";
import SectionLeisure from "./settings-sections/SectionLeisure";
import useHotelRealtime from "@/hooks/useHotelRealtime";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hotelSlug } = useParams();
  const queryClient = useQueryClient();
  
  // Check if current user can edit the public page
  const { canEdit } = useHotelPublicEditPermission(hotelSlug);
  
  console.log('[Settings] Permission Check:', { hotelSlug, canEdit, user });

  // Form state
  
  // Form state
  const [formData, setFormData] = useState({
    welcome_message: '',
    short_description: '',
    long_description: '',
    hero_image: '',
    gallery: [],
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    website: '',
    google_maps_link: '',
    amenities: [],
    logo: '',
    favicon: '',
    slogan: '',
    primary_color: '#3498db',
    secondary_color: '#2ecc71',
    accent_color: '#F59E0B',
    button_color: '#004faf',
    button_text_color: '#ffffff',
    button_hover_color: '#0066cc',
    text_color: '#333333',
    background_color: '#ffffff',
    border_color: '#e5e7eb',
    link_color: '#007bff',
    link_hover_color: '#0056b3',
  });

  const [hasChanges, setHasChanges] = useState(false);
  
  // Real-time updates via Pusher
  useHotelRealtime(
    hotelSlug,
    // Settings updated
    (data) => {
      console.log('[Settings] 🔄 Real-time settings update:', data);
      setFormData(prev => ({
        ...prev,
        hero_image: data.hero_image_display || data.hero_image || prev.hero_image,
        logo: data.logo_display || data.logo || prev.logo,
        favicon: data.favicon || prev.favicon,
        slogan: data.slogan || prev.slogan,
        gallery: data.gallery || prev.gallery,
      }));
      queryClient.invalidateQueries(['hotelPublicSettings', hotelSlug]);
    },
    // Gallery updated
    (update) => {
      console.log('[Settings] 🖼️ Real-time gallery update:', update);
      if (update.type === 'add') {
        setFormData(prev => ({
          ...prev,
          gallery: [...(prev.gallery || []), update.url],
        }));
      } else if (update.type === 'reorder') {
        setFormData(prev => ({
          ...prev,
          gallery: update.gallery,
        }));
      }
    },
    // Room type updated
    (data) => {
      console.log('[Settings] 🛏️ Real-time room type update:', data);
      queryClient.invalidateQueries(['staffRoomTypes', hotelSlug]);
      queryClient.invalidateQueries(['hotelPublicPage', hotelSlug]);
    }
  );
  
  // Debug: Log user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedStaff = localStorage.getItem('staff');
    const userData = storedUser ? JSON.parse(storedUser) : null;
    const staffData = storedStaff ? JSON.parse(storedStaff) : null;
    
    console.log('🔵🔵🔵 USER DATA FROM LOCALSTORAGE 🔵🔵🔵', userData);
    console.log('🔵 user.hotel_slug:', userData?.hotel_slug);
    console.log('🔵 user.hotel_id:', userData?.hotel_id);
    console.log('🔵 user.token:', userData?.token);
    
    console.log('🟢🟢🟢 STAFF DATA FROM LOCALSTORAGE 🟢🟢🟢', staffData);
    console.log('🟢 staff.hotel_slug:', staffData?.hotel_slug);
    console.log('🟢 staff.hotel_id:', staffData?.hotel_id);
    console.log('🟢 staff.token:', staffData?.token);
  }, []);
  
  // Fetch hotel data with room types from PUBLIC endpoint (for general display)
  const { data: hotelData, isLoading: hotelLoading } = useQuery({
    queryKey: ['hotelPublicPage', hotelSlug],
    queryFn: async () => {
      const response = await api.get(`/hotel/public/page/${hotelSlug}/`);
      console.log('[Settings] Hotel data with rooms:', response.data);
      return response.data;
    },
    enabled: !!hotelSlug && canEdit,
  });

  // Fetch room types from STAFF endpoint (includes IDs for editing)
  const { data: staffRoomTypes, isLoading: staffRoomTypesLoading, error: staffRoomTypesError } = useQuery({
    queryKey: ['staffRoomTypes', hotelSlug],
    queryFn: async () => {
      try {
        const response = await api.get(`/staff/hotel/${hotelSlug}/room-types/`);
        console.log('[Settings] 🏨 Staff room types RAW response:', response);
        console.log('[Settings] 🏨 Staff room types data:', response.data);
        console.log('[Settings] 🏨 Response status:', response.status);
        console.log('[Settings] 🏨 Is array?', Array.isArray(response.data));
        console.log('[Settings] 🏨 Has results?', response.data?.results);
        
        // Handle both array response and paginated response
        const roomTypesData = Array.isArray(response.data) 
          ? response.data 
          : response.data?.results || [];
        
        console.log('[Settings] 🏨 Final room types array:', roomTypesData);
        console.log('[Settings] 🏨 Room count:', roomTypesData.length);
        return roomTypesData;
      } catch (error) {
        console.error('[Settings] ❌ Failed to fetch room types:', error);
        console.error('[Settings] ❌ Error response:', error.response);
        throw error;
      }
    },
    enabled: !!hotelSlug && canEdit,
    onError: (error) => {
      console.error('[Settings] ❌ Room types query error:', error);
    },
  });

  // Fetch ALL offers from STAFF endpoint (includes both active and inactive)
  const { data: staffOffers, isLoading: offersLoading } = useQuery({
    queryKey: ['staffOffers', hotelSlug],
    queryFn: async () => {
      const response = await api.get(`/staff/hotel/${hotelSlug}/offers/`);
      console.log('[Settings] 🎁 Staff offers (all - active + inactive):', response.data);
      return response.data;
    },
    enabled: !!hotelSlug && canEdit,
  });

  // Fetch hotel settings
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['hotelPublicSettings', hotelSlug],
    queryFn: async () => {
      console.log('[Settings] 🔍 Fetching settings from:', `/staff/hotel/${hotelSlug}/settings/`);
      const response = await api.get(`/staff/hotel/${hotelSlug}/settings/`);
      console.log('[Settings] ✅ FULL RAW RESPONSE:', response);
      console.log('[Settings] ✅ RESPONSE.DATA:', response.data);
      console.log('[Settings] ✅ ALL KEYS IN RESPONSE.DATA:', Object.keys(response.data));
      console.log('[Settings] ✅ STRINGIFIED DATA:', JSON.stringify(response.data, null, 2));
      console.log('[Settings] ⭐ hero_image VALUE:', response.data.hero_image);
      console.log('[Settings] ⭐ landing_page_image VALUE:', response.data.landing_page_image);
      console.log('[Settings] ⭐ welcome_message VALUE:', response.data.welcome_message);
      console.log('[Settings] ⭐ short_description VALUE:', response.data.short_description);
      console.log('[Settings] ⭐ primary_color VALUE:', response.data.primary_color);
      return response.data;
    },
    enabled: !!hotelSlug && canEdit,
    onError: (error) => {
      console.error('[Settings] ❌ Settings fetch error:', error);
      console.error('[Settings] ❌ Error response:', error.response?.data);
      console.error('[Settings] ❌ Error status:', error.response?.status);
    },
  });

  // Note: Theme settings are included in the main settings response, no separate fetch needed
  // Backend returns: primary_color, secondary_color, accent_color, background_color, button_color, theme_mode

  // Apply hotel theme (sets CSS variables like --main-color, --primary-color, etc.)
  useHotelTheme(settings);

  // Initialize form data when settings load (includes both content AND theme from backend)
  useEffect(() => {
    console.log('[Settings] Settings data updated:', settings);
    console.log('[Settings] ⭐ HERO IMAGE FROM BACKEND (hero_image):', settings?.hero_image);
    console.log('[Settings] ⭐ HERO IMAGE FROM BACKEND (hero_image_display):', settings?.hero_image_display);
    if (settings) {
      console.log('[Settings] Populating form with settings:', {
        welcome_message: settings.welcome_message,
        hero_image: settings.hero_image,
        hero_image_display: settings.hero_image_display,
        short_description: settings.short_description,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
      });
      console.log('[Settings] ⭐ SETTING hero_image in formData:', settings.hero_image_display || settings.hero_image);
      setFormData(prev => ({
        ...prev,
        // Content fields
        welcome_message: settings.welcome_message || '',
        short_description: settings.short_description || '',
        long_description: settings.long_description || '',
        hero_image: settings.hero_image_display || settings.hero_image || '',
        contact_email: settings.contact_email || '',
        contact_phone: settings.contact_phone || '',
        contact_address: settings.contact_address || '',
        amenities: settings.amenities || [],
        logo: settings.logo_display || settings.logo || '',
        favicon: settings.favicon || '',
        slogan: settings.slogan || '',
        website: settings.website || '',
        google_maps_link: settings.google_maps_link || '',
        // Theme fields - load from backend or use defaults
        primary_color: settings.primary_color || '#3498db',
        secondary_color: settings.secondary_color || '#10B981',
        accent_color: settings.accent_color || '#F59E0B',
        button_color: settings.button_color || '#3B82F6',
        button_text_color: settings.button_text_color || '#ffffff',
        button_hover_color: settings.button_hover_color || '#0066cc',
        text_color: settings.text_color || '#333333',
        background_color: settings.background_color || '#FFFFFF',
        border_color: settings.border_color || '#e5e7eb',
        link_color: settings.link_color || '#007bff',
        link_hover_color: settings.link_hover_color || '#0056b3',
      }));
    } else {
      console.log('[Settings] No settings data available yet');
    }
  }, [settings]);

  // Handle field changes
  const handleFieldChange = (field, value) => {
    if (field === 'hero_image') {
      console.log('[Settings] ⭐ Hero image CHANGED to:', value);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      console.log('[Settings] Saving settings for hotel:', hotelSlug);
      
      // Combined payload - sending ALL theme fields frontend needs
      const settingsPayload = {
        // Content fields
        welcome_message: formData.welcome_message,
        short_description: formData.short_description,
        long_description: formData.long_description,
        hero_image: formData.hero_image,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        contact_address: formData.contact_address,
        amenities: formData.amenities,
        // Theme fields - ALL colors for full customization
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        accent_color: formData.accent_color,
        button_color: formData.button_color,
        button_text_color: formData.button_text_color,
        button_hover_color: formData.button_hover_color,
        text_color: formData.text_color,
        background_color: formData.background_color,
        border_color: formData.border_color,
        link_color: formData.link_color,
        link_hover_color: formData.link_hover_color,
        // TODO: Add these when backend adds support:
        // website: formData.website,
        // google_maps_link: formData.google_maps_link,
        // slogan: formData.slogan,
        // favicon: formData.favicon,
      };
      
      console.log('[Settings] Sending payload:', settingsPayload);

      console.log('[Settings] Payload being sent:', settingsPayload);
      
      const settingsResponse = await api.patch(
        `/staff/hotel/${hotelSlug}/settings/`,
        settingsPayload
      );
      
      console.log('[Settings] Save successful:', settingsResponse.data);

      return settingsResponse.data;
    },
    onSuccess: (data) => {
      console.log('[Settings] Save successful, data returned:', data);
      toast.success('Settings saved successfully!');
      setHasChanges(false);
      
      // Apply ALL theme changes to CSS variables from settings response
      if (data) {
        document.documentElement.style.setProperty('--primary-color', data.primary_color || '#3498db');
        document.documentElement.style.setProperty('--main-color', data.primary_color || '#3498db');
        document.documentElement.style.setProperty('--secondary-color', data.secondary_color || '#10B981');
        document.documentElement.style.setProperty('--accent-color', data.accent_color || '#F59E0B');
        document.documentElement.style.setProperty('--button-color', data.button_color || '#3B82F6');
        document.documentElement.style.setProperty('--button-text-color', data.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--button-hover-color', data.button_hover_color || '#0066cc');
        document.documentElement.style.setProperty('--text-color', data.text_color || '#333333');
        document.documentElement.style.setProperty('--background-color', data.background_color || '#FFFFFF');
        document.documentElement.style.setProperty('--border-color', data.border_color || '#e5e7eb');
        document.documentElement.style.setProperty('--link-color', data.link_color || '#007bff');
        document.documentElement.style.setProperty('--link-hover-color', data.link_hover_color || '#0056b3');
      }
      
      // Invalidate queries to refetch both settings and public page
      queryClient.invalidateQueries(['hotelPublicSettings', hotelSlug]);
      queryClient.invalidateQueries(['hotelPublicPage', hotelSlug]);
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate();
  };

  console.log('[Settings] Render state:', { 
    canEdit, 
    settingsLoading, 
    settingsError: settingsError?.message,
    hasSettings: !!settings,
    hotelSlug
  });

  if (!canEdit) {
    console.log('[Settings] User cannot edit - showing permission warning');
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          You don't have permission to edit hotel settings.
        </Alert>
      </Container>
    );
  }

  if (settingsLoading || hotelLoading) {
    console.log('[Settings] Loading state:', { settingsLoading, hotelLoading });
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading settings...</p>
      </Container>
    );
  }

  if (settingsError) {
    console.error('[Settings] Showing error state:', settingsError);
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <i className="bi bi-exclamation-circle me-2"></i>
          Failed to load settings. Please try again.
          <div className="mt-2 small">
            <strong>Error Details:</strong> {settingsError?.message || 'Unknown error'}
            {settingsError?.response?.status && ` (Status: ${settingsError.response.status})`}
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ maxWidth: '1200px', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="bi bi-gear-fill me-2"></i>
                Hotel Settings
              </h2>
              <p className="text-muted mb-0">
                Manage your hotel's public page and configuration
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-primary"
                onClick={() => window.open(`/${hotelSlug}`, '_blank')}
              >
                <i className="bi bi-eye me-2"></i>
                Preview Public Page
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Sections */}
      <Row>
        <Col>
          {/* 1. Public Page Overview */}
          <SectionPublicOverview 
            hotelSlug={hotelSlug} 
            formData={formData}
            settings={settings}
          />

          {/* 2. Content */}
          <SectionContent 
            formData={formData}
            onChange={handleFieldChange}
            hotelSlug={hotelSlug}
            onSaved={() => {
              queryClient.invalidateQueries(['hotelPublicSettings', hotelSlug]);
              queryClient.invalidateQueries(['hotelPublicPage', hotelSlug]);
            }}
          />

          {/* 3. Images */}
          <SectionImages 
            formData={formData}
            onChange={handleFieldChange}
            hotelSlug={hotelSlug}
            onSaved={() => {
              queryClient.invalidateQueries(['hotelPublicSettings', hotelSlug]);
              queryClient.invalidateQueries(['hotelPublicPage', hotelSlug]);
            }}
          />

          {/* 4. Amenities */}
          <SectionAmenities 
            formData={formData}
            onChange={handleFieldChange}
          />

          {/* 5. Contact */}
          <SectionContact 
            formData={formData}
            onChange={handleFieldChange}
          />

          {/* 6. Branding */}
          <SectionBranding 
            formData={formData}
            onChange={handleFieldChange}
            hotelSlug={hotelSlug}
          />

          {/* 7. Theme Settings */}
          <SectionTheme 
            formData={formData}
            onChange={handleFieldChange}
          />

          {/* 8. Rooms & Suites */}
          <SectionRooms 
            hotelSlug={hotelSlug}
            roomTypes={staffRoomTypes || hotelData?.room_types || []}
            onRoomsUpdate={() => {
              queryClient.invalidateQueries(['staffRoomTypes', hotelSlug]);
              queryClient.invalidateQueries(['hotelPublicPage', hotelSlug]);
            }}
          />

          {/* 9. Offers & Packages */}
              <SectionOffers 
                hotelSlug={hotelSlug}
                offers={staffOffers || []}
                onOffersUpdate={() => {
                  queryClient.invalidateQueries(['staffOffers', hotelSlug]);
                  queryClient.invalidateQueries(['hotelPublicPage', hotelSlug]);
                }}
              />          {/* 10. Leisure & Facilities */}
          <SectionLeisure 
            hotelSlug={hotelSlug}
            activities={hotelData?.leisure_activities || []}
            onActivitiesUpdate={() => {
              queryClient.invalidateQueries(['hotelPublicPage', hotelSlug]);
            }}
          />

          {/* 11. Staff Registration Packages */}
          <SectionStaffRegistration />

          {/* Save Button - Sticky at bottom */}
          {hasChanges && (
            <div 
              className="position-sticky bottom-0 bg-white shadow-lg p-3 rounded-top border"
              style={{ zIndex: 1000 }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <strong>You have unsaved changes</strong>
                  <p className="text-muted mb-0 small">
                    Save your changes to update the public page
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    onClick={() => window.location.reload()}
                    disabled={saveSettingsMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                  >
                    {saveSettingsMutation.isPending ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save me-2"></i>
                        Save All Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}