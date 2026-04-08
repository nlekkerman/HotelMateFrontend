/**
 * Room Management API Service
 * Handles all room type and room inventory CRUD operations.
 * Single canonical API module — do not scatter direct calls elsewhere.
 *
 * Backend endpoints:
 *   Room types:       /api/staff/hotel/{slug}/room-types/
 *   Room management:  /api/staff/hotel/{slug}/room-management/
 *   Room images:      /api/staff/hotel/{slug}/room-images/
 *   Bulk create:      /api/staff/hotel/{slug}/room-types/{id}/rooms/bulk-create/
 */

import api, { buildStaffURL } from './api';

// ==========================================
// ROOM TYPES  —  /staff/hotel/{slug}/room-types/
// ==========================================

export const fetchRoomTypes = async (hotelSlug) => {
  const url = buildStaffURL(hotelSlug, '', 'room-types/');
  const response = await api.get(url);
  return response.data;
};

export const createRoomType = async (hotelSlug, data) => {
  const url = buildStaffURL(hotelSlug, '', 'room-types/');
  const response = await api.post(url, data);
  return response.data;
};

export const updateRoomType = async (hotelSlug, roomTypeId, data) => {
  const url = buildStaffURL(hotelSlug, '', `room-types/${roomTypeId}/`);
  const response = await api.patch(url, data);
  return response.data;
};

export const deleteRoomType = async (hotelSlug, roomTypeId) => {
  const url = buildStaffURL(hotelSlug, '', `room-types/${roomTypeId}/`);
  const response = await api.delete(url);
  return response.data;
};

// ==========================================
// ROOM IMAGES  —  /staff/hotel/{slug}/room-images/
// ==========================================

export const uploadRoomTypePhoto = async (hotelSlug, roomTypeId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('room_type', roomTypeId);
  const url = buildStaffURL(hotelSlug, '', 'room-images/');
  const response = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ==========================================
// ROOMS  —  /staff/hotel/{slug}/room-management/
// ==========================================

export const fetchRooms = async (hotelSlug) => {
  let allResults = [];
  let nextUrl = buildStaffURL(hotelSlug, '', 'room-management/');

  while (nextUrl) {
    const response = await api.get(nextUrl);
    const data = response.data;

    if (Array.isArray(data)) {
      // Non-paginated response — return as-is
      return data;
    }

    if (Array.isArray(data?.results)) {
      allResults = [...allResults, ...data.results];
    }

    nextUrl = data?.next ? data.next.replace(api.defaults.baseURL, '') : null;
  }

  return allResults;
};

export const createRoom = async (hotelSlug, data) => {
  const url = buildStaffURL(hotelSlug, '', 'room-management/');
  const response = await api.post(url, data);
  return response.data;
};

export const updateRoom = async (hotelSlug, roomId, data) => {
  const url = buildStaffURL(hotelSlug, '', `room-management/${roomId}/`);
  const response = await api.patch(url, data);
  return response.data;
};

export const deleteRoom = async (hotelSlug, roomId) => {
  const url = buildStaffURL(hotelSlug, '', `room-management/${roomId}/`);
  const response = await api.delete(url);
  return response.data;
};

// ==========================================
// BULK CREATE  —  /staff/hotel/{slug}/room-types/{id}/rooms/bulk-create/
// ==========================================

export const bulkCreateRooms = async (hotelSlug, roomTypeId, data) => {
  const url = buildStaffURL(hotelSlug, '', `room-types/${roomTypeId}/rooms/bulk-create/`);
  const response = await api.post(url, data);
  return response.data;
};
