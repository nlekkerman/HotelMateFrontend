// src/services/shiftLocations.js
import api from "@/services/api";

export const getShiftLocations = (hotelSlug) =>
  api.get(`/attendance/${hotelSlug}/shift-locations/`).then(r => r.data);

export const createShiftLocation = (hotelSlug, payload) =>
  api.post(`/attendance/${hotelSlug}/shift-locations/`, payload).then(r => r.data);

export const updateShiftLocation = (hotelSlug, id, payload) =>
  api.put(`/attendance/${hotelSlug}/shift-locations/${id}/`, payload).then(r => r.data);

export const deleteShiftLocation = (hotelSlug, id) =>
  api.delete(`/attendance/${hotelSlug}/shift-locations/${id}/`).then(r => r.data);
