// src/services/shiftLocations.js
import api from "@/services/api";

export const getShiftLocations = (hotelSlug) =>
  api.get(`/staff/hotel/${hotelSlug}/attendance/shift-locations/`).then(r => r.data);

export const createShiftLocation = (hotelSlug, payload) =>
  api.post(`/staff/hotel/${hotelSlug}/attendance/shift-locations/`, payload).then(r => r.data);

export const updateShiftLocation = (hotelSlug, id, payload) =>
  api.put(`/staff/hotel/${hotelSlug}/attendance/shift-locations/${id}/`, payload).then(r => r.data);

export const deleteShiftLocation = (hotelSlug, id) =>
  api.delete(`/staff/hotel/${hotelSlug}/attendance/shift-locations/${id}/`).then(r => r.data);
