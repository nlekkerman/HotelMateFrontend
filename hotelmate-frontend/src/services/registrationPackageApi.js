import api from './api';

/**
 * Registration Package API service
 * Canonical endpoints for managing staff registration packages.
 */

export function listRegistrationPackages() {
  return api.get('/staff/registration-package/');
}

export function generateRegistrationPackages(hotelSlug, count = 1) {
  return api.post('/staff/registration-package/', {
    hotel_slug: hotelSlug,
    count,
  });
}

export function emailRegistrationPackage(packageId, payload) {
  return api.post(`/staff/registration-package/${packageId}/email/`, payload);
}

export function getPrintableRegistrationPackage(packageId) {
  return api.get(`/staff/registration-package/${packageId}/print/`);
}
