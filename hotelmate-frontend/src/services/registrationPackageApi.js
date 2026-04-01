import api from './api';

/**
 * Registration Package API service
 * Canonical endpoints for managing staff registration packages.
 */

export function listRegistrationPackages(hotelSlug) {
  return api.get(`/staff/hotel/${hotelSlug}/registration-packages/`);
}

export function generateRegistrationPackages(hotelSlug, count = 1) {
  return api.post(`/staff/hotel/${hotelSlug}/registration-packages/generate/`, {
    count,
  });
}

export function emailRegistrationPackage(hotelSlug, packageId, payload) {
  return api.post(
    `/staff/hotel/${hotelSlug}/registration-packages/${packageId}/email/`,
    payload
  );
}

export function getPrintableRegistrationPackage(hotelSlug, packageId) {
  return api.get(
    `/staff/hotel/${hotelSlug}/registration-packages/${packageId}/printable/`
  );
}
