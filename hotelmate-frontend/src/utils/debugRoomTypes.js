/**
 * Debug utility to test room types API response
 * This is a temporary file to debug the room types data structure
 */

import { publicAPI } from '@/services/api';

export const debugRoomTypesAPI = async (hotelSlug) => {
  try {
    console.log(`[Debug] 🔍 Fetching room types for hotel: ${hotelSlug}`);
    
    // Use centralized publicAPI service
    const response = await publicAPI.get(`/hotel/${hotelSlug}/page/`);
    
    const data = response.data;
    
    console.log('[Debug] 📦 Full API Response:', JSON.stringify(data, null, 2));
    
    // Look for rooms sections
    const roomsSections = data.sections?.filter(section => 
      section.element?.element_type === 'rooms_list' || 
      section.section_type === 'rooms' ||
      section.type === 'rooms' ||
      section.name?.toLowerCase().includes('room')
    );
    
    console.log('[Debug] 🏠 Found rooms sections:', roomsSections?.length || 0);
    
    roomsSections?.forEach((section, index) => {
      console.log(`[Debug] 🏠 Section ${index + 1}:`, {
        id: section.id,
        name: section.name,
        section_type: section.section_type,
        element_type: section.element?.element_type,
        has_rooms_data: !!section.rooms_data,
        room_types_count: section.rooms_data?.room_types?.length || 0
      });
      
      if (section.rooms_data?.room_types?.length > 0) {
        console.log(`[Debug] 🏠 First room type:`, section.rooms_data.room_types[0]);
      }
    });
    
    // Check if room data is elsewhere
    console.log('[Debug] 🔍 Hotel object keys:', Object.keys(data.hotel || {}));
    console.log('[Debug] 🔍 Top-level response keys:', Object.keys(data));
    
    return data;
    
  } catch (error) {
    console.error('[Debug] ❌ Error fetching room types:', error);
    return null;
  }
};

// Function to test from browser console
window.debugRoomTypes = debugRoomTypesAPI;