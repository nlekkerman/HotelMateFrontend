import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import BookingList from '@/components/staff/bookings/BookingList';
import './BookingManagement.css';

/**
 * Booking Management Page Component  
 * Modern booking management using canonical FilterSet
 */
const BookingManagementPage = () => {
  const { hotelSlug } = useParams();
  const { user } = useAuth();

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          Please log in to access booking management.
        </div>
      </div>
    );
  }

  return (
    <div className="booking-management-page">
      <div className="booking-management-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center py-3">
            <div>
              <h1 className="h3 mb-1">Booking Management</h1>
              <p className="text-muted mb-0">Manage room reservations and guest stays</p>
            </div>
          </div>
        </div>
      </div>

      <div className="booking-management-content">
        <BookingList hotelSlug={hotelSlug} />
      </div>
    </div>
  );
};
export default BookingManagementPage;