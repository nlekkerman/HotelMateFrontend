// src/services/shiftLocations.js
import api, { buildStaffURL } from "@/services/api";

export const getShiftLocations = (hotelSlug) =>
  api.get(buildStaffURL(hotelSlug, "attendance", "shift-locations/")).then(r => r.data);

export const createShiftLocation = (hotelSlug, payload) =>
  api.post(buildStaffURL(hotelSlug, "attendance", "shift-locations/"), payload).then(r => r.data);

export const updateShiftLocation = (hotelSlug, id, payload) =>
  api.put(buildStaffURL(hotelSlug, "attendance", `shift-locations/${id}/`), payload).then(r => r.data);

export const deleteShiftLocation = (hotelSlug, id) =>
  api.delete(buildStaffURL(hotelSlug, "attendance", `shift-locations/${id}/`)).then(r => r.data);
