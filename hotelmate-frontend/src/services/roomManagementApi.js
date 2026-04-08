/**
 * Room Management API Service
 * Handles all room type and room inventory CRUD operations.
 * Single canonical API module — do not scatter direct calls elsewhere.
 */

import api, { buildStaffURL } from './api';

// ==========================================
// ROOM TYPES
// ==========================================

export const fetchRoomTypes = async (hotelSlug) => {
  const url = buildStaffURL(hotelSlug, 'rooms', '/room-types/');
  const response = await api.get(url);
  return response.data;
};

export const createRoomType = async (hotelSlug, data) => {
  const url = buildStaffURL(hotelSlug, 'rooms', '/room-types/');
  const response = await api.post(url, data);
  return response.data;
};

export const updateRoomType = async (hotelSlug, roomTypeId, data) => {
  const url = buildStaffURL(hotelSlug, 'rooms', `/room-types/${roomTypeId}/`);
  const response = await api.patch(url, data);
  return response.data;
};

export const deleteRoomType = async (hotelSlug, roomTypeId) => {
  const url = buildStaffURL(hotelSlug, 'rooms', `/room-types/${roomTypeId}/`);
  const response = await api.delete(url);
  return response.data;
};

export const uploadRoomTypePhoto = async (hotelSlug, roomTypeId, imageFile) => {
  const formData = new FormData();
  formData.append('photo', imageFile);
  const url = buildStaffURL(hotelSlug, 'rooms', `/room-types/${roomTypeId}/`);
  const response = await api.patch(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ==========================================
// ROOMS
// ==========================================

export const fetchRooms = async (hotelSlug) => {
  const url = buildStaffURL(hotelSlug, 'rooms', '/inventory/');
  const response = await api.get(url);
  return response.data;
};

export const createRoom = async (hotelSlug, data) => {
  const url = buildStaffURL(hotelSlug, 'rooms', '/inventory/');
  const response = await api.post(url, data);
  return response.data;
};

export const bulkCreateRooms = async (hotelSlug, data) => {
  const url = buildStaffURL(hotelSlug, 'rooms', '/inventory/bulk-create/');
  const response = await api.post(url, data);
  return response.data;
};

export const updateRoom = async (hotelSlug, roomId, data) => {
  const url = buildStaffURL(hotelSlug, 'rooms', `/inventory/${roomId}/`);
  const response = await api.patch(url, data);
  return response.data;
};

export const deleteRoom = async (hotelSlug, roomId) => {
  const url = buildStaffURL(hotelSlug, 'rooms', `/inventory/${roomId}/`);
  const response = await api.delete(url);
  return response.data;
};
