import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import BookingList from '@/components/staff/bookings/BookingList';
import './BookingManagement.css';

/**
 * Booking Management Page Component
 * Main page for hotel staff to manage room bookings
 * Handles URL parameters for filtering (pending, confirmed, history)
 */
const BookingManagementPage = () => {
  const { hotelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Get filter from URL parameter
  const urlFilter = searchParams.get('filter');
  
  // Determine page title based on filter
  const getPageTitle = () => {
    switch (urlFilter) {
      case 'pending':
        return 'Pending Bookings';
      case 'confirmed':
        return 'Confirmed Bookings';
      case 'cancelled':
        return 'Cancelled Bookings';
      case 'history':
        return 'Booking History';
      default:
        return 'All Bookings';
    }
  };

  const getPageDescription = () => {
    switch (urlFilter) {
      case 'pending':
        return 'Bookings awaiting payment or staff approval';
      case 'confirmed':
        return 'Confirmed reservations ready for check-in';
      case 'cancelled':
        return 'Cancelled bookings and refunds';
      case 'history':
        return 'Completed and cancelled bookings';
      default:
        return 'Manage room reservations and guest bookings';
    }
  };

  
  // Quick action buttons - keep only Booking Management
  const getQuickActions = () => {
    const actions = [];

    // Only add Booking Management button
    actions.push({
      label: 'Booking Management',
      path: `/staff/hotel/${hotelSlug}/booking-management`,
      icon: 'gear',
      variant: 'info'
    });

    return actions;
  };

  return (
    <div className="booking-management-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col">
           
              {/* Page Title */}
              <div className="d-flex align-items-center">
                <div className="page-icon me-3">
                  <i className="bi bi-bed" style={{ fontSize: '2rem', color: '#3498db' }}></i>
                </div>
                <div>
                  <h1 className="page-title mb-0">{getPageTitle()}</h1>
                  <p className="page-description text-muted mb-0">{getPageDescription()}</p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="col-auto">
              <div className="quick-actions">
                {getQuickActions().map((action, index) => (
                  <a
                    key={index}
                    href={action.path}
                    className={`btn btn-${action.variant} btn-sm me-2`}
                  >
                    <i className={`bi bi-${action.icon} me-1`}></i>
                    {action.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        <div className="container-fluid">
          <BookingList hotelSlug={hotelSlug} urlParams={searchParams} />
        </div>
      </div>
    </div>
  );
};

export default BookingManagementPage;