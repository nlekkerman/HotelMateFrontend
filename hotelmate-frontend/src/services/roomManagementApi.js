/**
 * Room Management API Service
 * Handles all room type and room inventory CRUD operations.
 * Single canonical API module — do not scatter direct calls elsewhere.
 *
 * Backend endpoints:
 *   Room types:  /staff/hotel/{slug}/room-types/          (ViewSet on staff_hotel_router)
 *   Rooms list:  /staff/hotel/{slug}/turnover/rooms/      (read-only operational list)
 *   Room CRUD:   NOT YET AVAILABLE — bulk-create, single create, update, delete
 *                pending backend inventory endpoints.
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

export const uploadRoomTypePhoto = async (hotelSlug, roomTypeId, imageFile) => {
  const formData = new FormData();
  formData.append('photo', imageFile);
  const url = buildStaffURL(hotelSlug, '', `room-types/${roomTypeId}/`);
  const response = await api.patch(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ==========================================
// ROOMS  —  read via turnover/rooms/, write endpoints pending
// ==========================================

/**
 * Fetch all rooms (uses operational turnover endpoint).
 * Returns categorical data: { status: { rooms: [...] } }
 */
export const fetchRooms = async (hotelSlug) => {
  const url = buildStaffURL(hotelSlug, '', 'turnover/rooms/');
  const response = await api.get(url);
  return response.data;
};

// ---- Write endpoints below require backend inventory routes ----
// Kept as stubs so the UI compiles; they will 404 until backend ships.

export const createRoom = async (hotelSlug, data) => {
  const url = buildStaffURL(hotelSlug, '', 'rooms/');
  const response = await api.post(url, data);
  return response.data;
};

export const bulkCreateRooms = async (hotelSlug, data) => {
  const url = buildStaffURL(hotelSlug, '', 'rooms/bulk-create/');
  const response = await api.post(url, data);
  return response.data;
};

export const updateRoom = async (hotelSlug, roomId, data) => {
  const url = buildStaffURL(hotelSlug, '', `rooms/${roomId}/`);
  const response = await api.patch(url, data);
  return response.data;
};

export const deleteRoom = async (hotelSlug, roomId) => {
  const url = buildStaffURL(hotelSlug, '', `rooms/${roomId}/`);
  const response = await api.delete(url);
  return response.data;
};
