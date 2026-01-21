import React, { useState, useEffect } from 'react';
import BookingActions from './BookingActions';
import BookingDetailsModal from './BookingDetailsModal';
import BookingStatusBadges from './BookingStatusBadges';
import BookingTimeWarningBadges from './BookingTimeWarningBadges';
import { useRoomBookingDispatch } from '@/realtime/stores/roomBookingStore';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

/**
 * Booking Table Component
 * Displays bookings in a responsive table with actions
 */
const BookingTable = ({ 
  bookings, 
  onSendPrecheckin, 
  onApprove, 
  onDecline, 
  loading, 
  isBookingAccepting, 
  isBookingDeclining, 
  hotelSlug 
}) => {
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [staffProfile, setStaffProfile] = useState(null);
  const dispatch = useRoomBookingDispatch();
  const { user } = useAuth();
  
  // Fetch staff profile for proper name display
  useEffect(() => {
    if (!user || !hotelSlug) {
      setStaffProfile(null);
      return;
    }
    
    console.log('🔍 [BookingTable] Fetching staff profile for user:', user.staff_id, 'hotelSlug:', hotelSlug);
    
    api
      .get(`/staff/hotel/${hotelSlug}/me/`)
      .then((res) => {
        console.log('🔍 [BookingTable] Staff profile response:', res.data);
        setStaffProfile(res.data);
      })
      .catch((error) => {
        console.log('🔍 [BookingTable] Staff profile fetch failed, trying fallback:', error);
        // Fallback to old endpoint
        api
          .get("/staff/me/")
          .then((res) => {
            console.log('🔍 [BookingTable] Fallback staff profile response:', res.data);
            setStaffProfile(res.data);
          })
          .catch((fallbackError) => {
            console.log('🔍 [BookingTable] Both staff profile endpoints failed:', fallbackError);
            setStaffProfile(null);
          });
      });
  }, [user, hotelSlug]);
  
  const handleViewPrecheckin = (bookingId) => {
    setSelectedBookingId(bookingId);
    setShowDetailsModal(true);
    // Scroll to precheckin section after modal opens
    setTimeout(() => {
      const precheckinSection = document.querySelector('[data-precheckin-summary]');
      if (precheckinSection) {
        precheckinSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300); // Wait for modal to fully render
  };
  
  const handleBookingClick = async (booking) => {
    // Mark as seen if not already seen
    if (!booking.staff_seen_at) {
      // 🔥 Optimistic update (instant UI feedback)
      // Create a better display name from available staff profile data
      console.log('🔍 [BookingTable] Creating display name from:', {
        staffProfile,
        staffProfile_first_name: staffProfile?.first_name,
        staffProfile_last_name: staffProfile?.last_name,
        staffProfile_full_name: staffProfile?.full_name,
        user_username: user?.username,
        user_email: user?.email,
        user_staff_id: user?.staff_id,
        user_id: user?.id
      });
      
      const displayName = staffProfile?.first_name && staffProfile?.last_name 
                           ? `${staffProfile.first_name} ${staffProfile.last_name}` 
                           : staffProfile?.full_name ||
                             user?.username || 
                             user?.email?.split('@')[0] ||
                             `Staff #${user?.staff_id || user?.id}`;
                             
      console.log('🔍 [BookingTable] Final display name:', displayName);
      
      const optimisticUpdate = {
        ...booking,
        staff_seen_at: new Date().toISOString(),
        staff_seen_by: displayName,
        is_new_for_staff: false, // Explicitly set to false to remove NEW badge
      };
      
      // Update in store immediately via dispatch
      dispatch({
        type: 'ROOM_BOOKING_UPDATED',
        payload: { 
          booking: optimisticUpdate, 
          bookingId: booking.booking_id 
        }
      });
      
      // 🔒 Persist in backend (async, no waiting)
      try {
        await api.post(
          `/staff/hotel/${hotelSlug}/room-bookings/${booking.booking_id}/mark-seen/`
        );
      } catch (error) {
        console.warn('[BookingTable] Failed to mark booking as seen:', error);
        // Note: Realtime event will eventually sync if this fails
      }
    }
    
    setSelectedBookingId(booking.booking_id);
    setShowDetailsModal(true);
  };
  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedBookingId(null);
  };

  // Sorting by urgency rank system with unseen bookings pinned at top
  const sortedBookings = React.useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    const getApprovalRank = (approvalRiskLevel) => {
      if (!approvalRiskLevel) return 3; // Missing field = OK rank
      switch (approvalRiskLevel.toUpperCase()) {
        case 'CRITICAL': return 0;
        case 'OVERDUE': return 1;
        case 'DUE_SOON': return 2;
        case 'OK': return 3;
        default: 
          // Dev-only warning for unknown values
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[BookingTable] Unknown approval_risk_level:', approvalRiskLevel);
          }
          return 3;
      }
    };

    const getOverstayRank = (overstayRiskLevel) => {
      if (!overstayRiskLevel) return 3; // Missing field = OK rank
      switch (overstayRiskLevel.toUpperCase()) {
        case 'CRITICAL': return 0;
        case 'OVERDUE': return 1;
        case 'GRACE': return 2;
        case 'OK': return 3;
        default:
          // Dev-only warning for unknown values
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[BookingTable] Unknown overstay_risk_level:', overstayRiskLevel);
          }
          return 3;
      }
    };

    const getUrgencyRank = (booking) => {
      const approvalRank = getApprovalRank(booking.approval_risk_level);
      const overstayRank = getOverstayRank(booking.overstay_risk_level);
      // Use the worst of the two (min rank = highest urgency)
      return Math.min(approvalRank, overstayRank);
    };

    const isUnseen = (booking) => {
      return !booking.staff_seen_at || booking.is_new_for_staff === true;
    };

    return [...bookings].sort((a, b) => {
      const aUnseen = isUnseen(a);
      const bUnseen = isUnseen(b);

      // Unseen bookings ALWAYS come first
      if (aUnseen && !bUnseen) return -1;
      if (!aUnseen && bUnseen) return 1;

      // If both unseen or both seen, sort by urgency rank
      if (aUnseen && bUnseen) {
        const aUrgency = getUrgencyRank(a);
        const bUrgency = getUrgencyRank(b);
        
        if (aUrgency !== bUrgency) {
          return aUrgency - bUrgency; // Lower rank = higher urgency
        }
        
        // Same urgency rank, sort by created_at DESC (newest first)
        const aTime = new Date(a.created_at || 0);
        const bTime = new Date(b.created_at || 0);
        return bTime - aTime;
      }

      // Both seen - keep existing behavior (or created_at DESC if no other sorting)
      const aTime = new Date(a.created_at || 0);
      const bTime = new Date(b.created_at || 0);
      return bTime - aTime;
    });
  }, [bookings]);

  if (bookings.length === 0) {
    return (
      <div className="booking-table-empty">
        <div className="text-center py-5">
          <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          <h5 className="mt-3 text-muted">No bookings found</h5>
          <p className="text-muted">Try adjusting your filters or check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-table-container">
      <div className="table-responsive">
        <table className="table booking-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Guest Details</th>
              <th>Room Type</th>
              <th>Stay Period</th>
              <th>Guests</th>
              <th>Party</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Warnings</th>
              <th>Actions</th>
            </tr>
          </thead>
        <tbody>
  {sortedBookings.map((booking) => {
    // 🔥 DEBUG: verify what the LIST row actually receives (not the modal)
    if (booking?.booking_id === "BK-2025-0005") {
      console.log("LIST ROW BK-2025-0005", {
        booking_id: booking.booking_id,
        checked_in_at: booking.checked_in_at,
        checked_out_at: booking.checked_out_at,
        updated_at: booking.updated_at,
        room_number: booking.room?.room_number,
        room_type_name_root: booking.room_type_name,
        room_type_name_room: booking.room?.room_type_name,
        party_primary: booking.party?.primary?.full_name,
        party_total: booking.party?.total_count,
      });
    }

    return (
      <tr
        key={booking.booking_id}
        className={`${loading ? 'table-row-loading' : ''} booking-row-clickable`}
        onClick={() => handleBookingClick(booking)}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <div className="booking-id-cell">
            <strong className="booking-id">{booking.booking_id}</strong>
            {booking.confirmation_number && (
              <small className="confirmation-number d-block text-muted">
                {booking.confirmation_number}
              </small>
            )}
            {booking.created_at && (
              <small className="created-date d-block text-muted">
                Created: {formatDate(booking.created_at)}
              </small>
            )}
          </div>
        </td>

        <td>
          <div className="guest-info-cell">
            <div className="guest-name fw-semibold">
              {(() => {
                // ✅ LIST SAFE: Use flat fields first, then fallback to nested structure
                const displayName =
                  booking.party?.primary?.full_name ??
                  booking.party_primary_full_name ??
                  booking.guest_display_name ??
                  (booking.party?.primary?.first_name && booking.party?.primary?.last_name
                    ? `${booking.party.primary.first_name} ${booking.party.primary.last_name}`
                    : "Guest Information Pending");

                return displayName === "Guest Information Pending" ? (
                  <span className="text-muted">Guest Information Pending</span>
                ) : (
                  displayName
                );
              })()}
            </div>

            {booking.party?.primary?.email && (
              <small className="guest-email d-block text-muted">
                <i className="bi bi-envelope me-1"></i>
                {booking.party.primary.email}
              </small>
            )}
            {booking.party?.primary?.phone && (
              <small className="guest-phone d-block text-muted">
                <i className="bi bi-telephone me-1"></i>
                {booking.party.primary.phone}
              </small>
            )}
          </div>
        </td>

        <td>
          <span className="room-type">
            {booking.room_type_name ?? booking.room?.room_type_name ?? '—'}
          </span>
        </td>

        <td>
          <div className="stay-period-cell">
            <div className="dates">
              <i className="bi bi-calendar-range me-1"></i>
              {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
            </div>
            <small className="nights text-muted">
              {calculateNights(booking.check_in, booking.check_out)} nights
            </small>
          </div>
        </td>

        <td>
          <div className="guest-count">
            <i className="bi bi-people me-1"></i>
            {(() => {
              // ✅ LIST SAFE: Use flat field first, then fallback to nested structure
              const guestCount = booking.party?.total_count ?? booking.party_total_count ?? 0;
              return guestCount > 0 ? (
                <span>
                  {guestCount} guest{guestCount !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-muted">—</span>
              );
            })()}
          </div>
        </td>

        <td>
          <div className="d-flex flex-wrap gap-1">
            {(() => {
              const isPrecheckinComplete = booking?.precheckin_submitted_at != null;
              return (
                <span className={`badge ${isPrecheckinComplete ? 'bg-checked' : 'bg-pre-checkin-pending'}`}>
                  {isPrecheckinComplete ? (
                    <>
                      <i className="bi bi-check-circle me-1"></i>Pre-Check-In Complete
                    </>
                  ) : (
                    <>
                      <i className="bi bi-clock me-1"></i>Pre-Check-In Pending
                    </>
                  )}
                </span>
              );
            })()}
          </div>
        </td>

        <td>
          <div className="amount-cell">
            <strong className="total-amount">
              {booking.total_amount !== null && booking.total_amount !== undefined ? (
                formatCurrency(booking.total_amount, booking.currency)
              ) : (
                <span className="text-muted">Pending calculation</span>
              )}
            </strong>
            {booking.paid_at && (
              <div className="paid-indicator">
                <i className="bi bi-check-circle-fill text-success me-1"></i>
                <small className="text-success">Paid</small>
              </div>
            )}
          </div>
        </td>

        <td>
          <BookingStatusBadges booking={booking} />
        </td>

        <td>
          <div className="d-flex flex-column gap-1">
            <BookingTimeWarningBadges booking={booking} />
            {booking.staff_seen_at && booking.staff_seen_by && (
              <span className="badge bg-info" title={`First seen at ${new Date(booking.staff_seen_at).toLocaleString()}`}>
                First seen by: {(() => {
                  // Convert to string to ensure we can check it safely
                  const staffSeenByStr = String(booking.staff_seen_by);
                  // If staff_seen_by is already a formatted name (contains space), use it
                  if (staffSeenByStr.includes(' ')) {
                    return staffSeenByStr;
                  }
                  // Otherwise, try to format from staff profile or fall back to existing value
                  if (staffProfile?.first_name && staffProfile?.last_name) {
                    return `${staffProfile.first_name} ${staffProfile.last_name}`;
                  }
                  return staffSeenByStr;
                })()}
              </span>
            )}
          </div>
        </td>

        <td onClick={(e) => e.stopPropagation()}>
          <BookingActions
            booking={booking}
            onSendPrecheckin={onSendPrecheckin}
            onApprove={onApprove}
            onDecline={onDecline}
            onViewPrecheckin={handleViewPrecheckin}
            loading={loading}
            isAccepting={isBookingAccepting(booking.booking_id)}
            isDeclining={isBookingDeclining(booking.booking_id)}
          />
        </td>
      </tr>
    );
  })}
</tbody>

        </table>
      </div>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        show={showDetailsModal}
        bookingId={selectedBookingId}
        hotelSlug={hotelSlug}
        onClose={handleCloseModal}
        staffProfile={staffProfile}
      />
    </div>
  );
};

export default BookingTable;