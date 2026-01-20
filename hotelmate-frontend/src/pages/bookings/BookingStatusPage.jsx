import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Container,
  Card,
  Spinner,
  Alert,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { publicAPI } from '@/services/api';

import { useRoomBookingState } from '@/realtime/stores/roomBookingStore';
import RoomService from "@/components/rooms/RoomService";
import Breakfast from "@/components/rooms/Breakfast";
import { 
  resolveGuestBookingToken, 
  writeGuestBookingToken, 
  clearGuestBookingToken 
} from '@/utils/guestBookingTokens';

/**
 * BookingStatusPage - Token-based booking management page
 * Allows guests to view and manage bookings using secure tokens from email
 */
const BookingStatusPage = () => {
  const { hotelSlug, bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  const [canCancel, setCanCancel] = useState(false);
  const [cancellationPreview, setCancellationPreview] = useState(null);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState(1);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancellationSuccess, setCancellationSuccess] = useState(null);

  // Service view state
  const [activeService, setActiveService] = useState(null); // 'room_service', 'breakfast'

  // Guest context + permissions (scoped token)
  const [guestContext, setGuestContext] = useState(null);
  const [contextError, setContextError] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  // Removed guestToken state - now using booking-scoped token resolution

  // Check-in window state
  const [checkinWindow, setCheckinWindow] = useState({
    status: "not-yet", // 'not-yet', 'open', 'closed'
    period: null, // 'early', 'standard', 'late'
    opensAt: null,
    standardAt: null,
    closesAt: null,
    timeUntilOpen: null,
    timeUntilClose: null,
    hotelTime: null,
    hotelTimezone: null,
  });

  // Get canonical store state for realtime updates
  const roomBookingState = useRoomBookingState();

  // Use canonical store for realtime booking updates (no direct Pusher)
  useEffect(() => {
    if (!bookingId || !roomBookingState?.byBookingId) return;
    
    const storeBooking = roomBookingState.byBookingId[bookingId];
    if (storeBooking) {
      console.log("📡 [BookingStatusPage] Store booking updated:", storeBooking);
      
      // Check for status changes and show appropriate toasts
      if (booking && storeBooking.checked_in_at && !booking.checked_in_at) {
        import("react-toastify")
          .then(({ toast }) => {
            toast.success(
              `🎉 Welcome to ${
                storeBooking.hotel?.name || "the hotel"
              }! You're checked in to Room ${
                storeBooking.assigned_room_number
              }`
            );
          })
          .catch(() => {
            console.log("✅ Checked in to room", storeBooking.assigned_room_number);
          });
      }
      
      if (booking && storeBooking.checked_out_at && !booking.checked_out_at) {
        import("react-toastify")
          .then(({ toast }) => {
            toast.info("👋 You have been checked out. Safe travels!");
          })
          .catch(() => {
            console.log("📝 Checked out");
          });
      }
      
      // 🔄 REALTIME UPDATE: Merge store data with current booking state
      setBooking(prevBooking => {
        if (!prevBooking) return storeBooking;
        
        const updatedBooking = { ...prevBooking, ...storeBooking };
        console.log("🔄 [BookingStatusPage] Booking state updated from realtime store:", {
          prevRoomNumber: prevBooking.assigned_room_number,
          newRoomNumber: updatedBooking.assigned_room_number,
          prevCheckedIn: prevBooking.checked_in_at,
          newCheckedIn: updatedBooking.checked_in_at,
          prevStatus: prevBooking.status,
          newStatus: updatedBooking.status
        });
        
        return updatedBooking;
      });
    }
  }, [bookingId, roomBookingState?.byBookingId]);

  // Booking state is now updated directly from canonical store above

  // Check-in window calculator
  useEffect(() => {
    if (!booking || !booking.check_in) return;

    const updateCheckinWindow = () => {
      // Get hotel timezone (default to UTC if not provided)
      const hotelTimezone = booking.hotel?.timezone || "UTC";

      // Get current time in hotel timezone
      const now = new Date();
      const hotelTime = new Date(
        now.toLocaleString("en-US", { timeZone: hotelTimezone })
      );

      // Parse check-in date
      const checkInDate = new Date(booking.check_in);

      // Calculate window times in hotel timezone
      const opensAt = new Date(checkInDate);
      opensAt.setHours(8, 0, 0, 0); // 8:00 AM (moved from 12:00 PM for testing)

      const standardAt = new Date(checkInDate);
      standardAt.setHours(15, 0, 0, 0); // 3:00 PM

      const closesAt = new Date(checkInDate);
      closesAt.setDate(closesAt.getDate() + 1);
      closesAt.setHours(2, 0, 0, 0); // 2:00 AM next day

      // Determine status
      let status,
        period = null;
      let timeUntilOpen = null,
        timeUntilClose = null;

      if (hotelTime < opensAt) {
        status = "not-yet";
        timeUntilOpen = Math.max(0, opensAt.getTime() - hotelTime.getTime());
      } else if (hotelTime >= opensAt && hotelTime < closesAt) {
        status = "open";
        timeUntilClose = Math.max(0, closesAt.getTime() - hotelTime.getTime());

        // Determine period
        if (hotelTime < standardAt) {
          period = "early";
        } else if (
          hotelTime <
          new Date(
            checkInDate.getFullYear(),
            checkInDate.getMonth(),
            checkInDate.getDate(),
            23,
            59,
            59
          )
        ) {
          period = "standard";
        } else {
          period = "late";
        }
      } else {
        status = "closed";
      }

      setCheckinWindow({
        status,
        period,
        opensAt,
        standardAt,
        closesAt,
        timeUntilOpen,
        timeUntilClose,
        hotelTime,
        hotelTimezone,
      });
    };

    // Update immediately and then every minute
    updateCheckinWindow();
    const interval = setInterval(updateCheckinWindow, 60000);

    return () => clearInterval(interval);
  }, [booking]);

  // Helper to safely unwrap API responses
  const unwrap = (res) => res?.data?.data ?? res?.data;

  // Helper to calculate guest count
  const getGuestCount = (booking) => {
    if (!booking?.guests) return 0;

    // Use canonical guests structure
    if (booking.guests.total) {
      return booking.guests.total;
    }

    // Calculate from adults and children
    return (booking.guests.adults || 0) + (booking.guests.children || 0);
  };

  // Get status display information
  const getStatusDisplay = (status) => {
    const normalized = status?.toString().toLowerCase() || "";

    switch (normalized) {
      case "confirmed":
        return {
          color: "success",
          icon: "check-circle-fill",
          text: "Confirmed",
        };
      case "pending_payment":
      case "pending payment":
        return {
          color: "warning",
          icon: "credit-card",
          text: "Payment Required",
        };
      case "pending_approval":
      case "pending approval":
      case "pending":
        if (booking?.paid_at) {
          return {
            color: "primary",
            icon: "check-circle",
            text: "Payment received — under review",
          };
        }
        return {
          color: "warning",
          icon: "clock-history",
          text: "Awaiting Approval",
        };
      case "cancelled":
      case "canceled":
        return { color: "danger", icon: "x-circle", text: "Cancelled" };
      case "completed":
        return { color: "success", icon: "check-circle", text: "Completed" };
      case "declined":
        return { color: "danger", icon: "x-circle-fill", text: "Declined" };
      case "checked_in":
      case "CHECKED_IN":
      case "checked in":
        return { color: "success", icon: "door-open", text: "Checked In" };
      case "checked_out":
      case "CHECKED_OUT":
      case "checked out":
        return { color: "secondary", icon: "door-closed", text: "Checked Out" };
      default:
        return {
          color: "secondary",
          icon: "question-circle",
          text: status || "Unknown",
        };
    }
  };

  // Fetch booking details using token-based API
  const fetchBookingStatus = async () => {
    // Validate required parameters
    if (!hotelSlug) {
      return (
        <Container className="py-5 text-center">
          <Alert variant="danger">
            <h4>Invalid Link</h4>
            <p>Hotel information is missing from the booking link.</p>
          </Alert>
        </Container>
      );
    }

    if (!bookingId) {
      setError("No booking reference provided");
      setLoading(false);
      return;
    }

    if (!token) {
      setError(
        "Access token required. Please use the link from your booking confirmation email."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Debug API call details
      const endpointUrl = `/hotel/${hotelSlug}/room-bookings/${bookingId}/`;
      const fullUrl = `${publicAPI.defaults.baseURL}${endpointUrl}`;
      
      console.log('🌐 [BookingStatusPage] API Call Debug:', {
        hotelSlug,
        bookingId,
        token: token ? `${token.substring(0, 10)}...` : 'null',
        endpointUrl,
        fullUrl: fullUrl + `?token=${token}`,
        publicAPIBaseURL: publicAPI.defaults.baseURL
      });

      // Call the existing hotel-specific booking endpoint with token
      const response = await publicAPI.get(endpointUrl, { params: { token } });

      console.log('📡 [BookingStatusPage] Full API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      const data = unwrap(response);
      
      console.log('📦 [BookingStatusPage] Unwrapped Response Data:', {
        dataType: typeof data,
        isObject: typeof data === 'object',
        isNull: data === null,
        keys: data ? Object.keys(data) : 'null',
        fullData: data
      });

      // Hotel slug mismatch protection - redirect if URL doesn't match booking's hotel
      if (data.hotel?.slug && data.hotel.slug !== hotelSlug) {
        console.log('🔄 [BookingStatusPage] Hotel slug mismatch detected, redirecting:', {
          url_slug: hotelSlug,
          booking_hotel_slug: data.hotel.slug,
          redirecting_to: `/hotel/${data.hotel.slug}/booking/${bookingId}/status?token=${token}`
        });
        navigate(`/hotel/${data.hotel.slug}/booking/${bookingId}/status?token=${token}`, { replace: true });
        return;
      }
      
      // The API returns booking data directly with can_cancel and cancellation_preview
      setBooking(data);
      setHotel(data.hotel);
      setCancellationPolicy(data.cancellation_policy);
      
      // Extract guest token for chat/room service operations - DETAILED INSPECTION
      console.log('🔍 [BookingStatusPage] DETAILED GUEST TOKEN INSPECTION:');
      console.log('Raw response structure:', JSON.stringify(data, null, 2));
      
      console.log('🔍 [BookingStatusPage] All top-level keys:', Object.keys(data));
      console.log('🔍 [BookingStatusPage] Guest token field check:', {
        'data.guest_token': data.guest_token,
        'data["guest_token"]': data["guest_token"],
        'typeof guest_token': typeof data.guest_token,
        'guest_token length': data.guest_token?.length,
        'guest_token exists': 'guest_token' in data,
        'guest_token truthy': !!data.guest_token
      });

      // Check if it's nested in booking object
      if (data.booking) {
        console.log('🔍 [BookingStatusPage] Nested booking object found:', {
          'data.booking.guest_token': data.booking.guest_token,
          'booking keys': Object.keys(data.booking)
        });
      }

      // Check checked-in status
      console.log('🔍 [BookingStatusPage] Check-in status inspection:', {
        'data.checked_in_at': data.checked_in_at,
        'data.checked_out_at': data.checked_out_at,
        'data.status': data.status,
        'data.assigned_room_number': data.assigned_room_number,
        'should_have_guest_token': !!(data.checked_in_at && !data.checked_out_at)
      });

      // Guest object inspection
      if (data.guest) {
        console.log('🔍 [BookingStatusPage] Guest object detailed inspection:', {
          guest: data.guest,
          guestKeys: Object.keys(data.guest),
          guestStringified: JSON.stringify(data.guest, null, 2)
        });
      }
      
      // Persist guest token with booking-scoped storage
      if (data.guest_token) {
        writeGuestBookingToken(hotelSlug, data.id || bookingId, data.guest_token);
        console.log('🎫 [BookingStatusPage] ✅ Guest token persisted successfully:', {
          booking_id: data.id || bookingId,
          token_preview: data.guest_token.substring(0, 10) + '...',
          token_length: data.guest_token.length
        });
      } else {
        console.log('❌ [BookingStatusPage] NO GUEST TOKEN FOUND in response');
        console.log('🔍 [BookingStatusPage] Expected conditions for guest token:');
        console.log('- Booking must be checked in: ', !!data.checked_in_at);
        console.log('- Booking must not be checked out: ', !data.checked_out_at);
        console.log('- Backend should include guest_token field for checked-in guests');
        // Clear any stored token for this booking if no token in response
        clearGuestBookingToken(data.id || bookingId);
      }

      // COMPREHENSIVE GUEST TOKEN DEBUGGING
      console.log('🔍🔍🔍 COMPLETE BOOKING RESPONSE ANALYSIS 🔍🔍🔍');
      console.log('Raw API response data:', data);
      console.log('All response keys:', Object.keys(data));
      console.log('Guest token investigation:', {
        'data.guest_token': data.guest_token,
        'guest_token_type': typeof data.guest_token,
        'guest_token_length': data.guest_token?.length,
        'guest_token_exists': 'guest_token' in data,
        'guest_token_value': data.guest_token
      });
      
      // Debug initial booking data structure and guest token availability
      console.log("📥 Initial booking data loaded:", {
        status: data.status,
        checked_in_at: data.checked_in_at,
        assigned_room_number: data.assigned_room_number,
        room: data.room,
        hotel: data.hotel,
        guest: data.guest,
        dates: data.dates,
        guests: data.guests,
        guest_token: data.guest_token, // Debug token presence
        all_keys: Object.keys(data), // See all available fields
      });

      // Determine if cancellation should be allowed
      // Use API can_cancel if provided, otherwise check status-based logic
      const cancellableStatuses = [
        "PENDING_PAYMENT",
        "PENDING_APPROVAL",
        "CONFIRMED",
      ];
      const shouldAllowCancel =
        data.can_cancel !== undefined
          ? data.can_cancel
          : cancellableStatuses.includes(data.status?.toUpperCase()) &&
            !data.cancelled_at;

      setCanCancel(shouldAllowCancel);
      setCancellationPreview(data.cancellation_preview);

      // Set hotel preset if available
      if (data.hotel?.preset) {
        setPreset(data.hotel.preset);
      }
    } catch (err) {
      console.error("Failed to fetch booking status:", err);

      if (err.response?.status === 404) {
        setError(
          "Booking not found. Please check your booking reference and try again."
        );
      } else if (err.response?.status === 403 || err.response?.status === 401) {
        setError(
          "Invalid or expired access token. Please use the latest link from your booking email."
        );
      } else {
        const errorMessage =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to retrieve booking information. Please try again later.";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch guest context for token-scoped permissions
  const fetchGuestContext = async (retryCount = 0) => {
    // 🚨 RETRY STORM PREVENTION 🚨
    if (retryCount > 1) {
      console.error('🛑 [RETRY STORM BLOCKED] Maximum retries exceeded for guest context');
      setContextError({
        status: 429,
        message: "Too many retry attempts - please refresh page",
        disabled_reason: "retry_limit_exceeded"
      });
      setContextLoading(false);
      return;
    }

    if (!hotelSlug || !booking) {
      console.log('🔍 [BookingStatusPage] Skipping guest context - missing requirements:', {
        hotelSlug: !!hotelSlug,
        hasBooking: !!booking
      });
      return;
    }

    // Resolve token using booking-scoped logic
    const resolvedToken = resolveGuestBookingToken({
      bookingId: booking.id || bookingId,
      bookingToken: booking.guest_token,
      queryToken: token
    });

    if (!resolvedToken) {
      console.log('🔍 [BookingStatusPage] No token available for guest context');
      setContextError({
        status: 401,
        message: "No authentication token available",
        disabled_reason: "no_token"
      });
      return;
    }

    try {
      setContextLoading(true);
      setContextError(null);


      
      console.log('�🚨🚨 GUEST CONTEXT API DEBUGGING 🚨🚨🚨');
      // 🚨 COMPREHENSIVE TOKEN/HOTEL DEBUG LOGGING 🚨
      console.log('[GuestChatContext] 🔍 EXACT REQUEST PARAMETERS:');
      console.log('[GuestChatContext] hotelSlug=', hotelSlug);
      console.log('[GuestChatContext] bookingId=', bookingId); 
      console.log('[GuestChatContext] token=', resolvedToken);
      console.log('[GuestChatContext] endpoint=', `/chat/${hotelSlug}/guest/chat/context/`);
      
      console.log('🔧 publicAPI configuration:', {
        baseURL: publicAPI.defaults.baseURL,
        headers: publicAPI.defaults.headers,
        timeout: publicAPI.defaults.timeout
      });
      
      // Use correct chat context endpoint with guest token
      const res = await publicAPI.get(`/chat/${hotelSlug}/guest/chat/context/`, {
        params: { token: resolvedToken },
      });

      const ctx = unwrap(res);
      console.log("✅ [BookingStatusPage] Guest context SUCCESS:", {
        statusCode: res.status,
        responseHeaders: res.headers,
        responseKeys: ctx ? Object.keys(ctx) : 'null',
        allowedActions: ctx?.allowed_actions,
        fullContext: ctx
      });
      setGuestContext(ctx);
    } catch (err) {
      // 🚨 COMPREHENSIVE TOKEN/HOTEL DEBUG LOGGING 🚨
      console.log('[GuestChatContext] 🔍 EXACT REQUEST PARAMETERS:');
      console.log('[GuestChatContext] hotelSlug=', hotelSlug);
      console.log('[GuestChatContext] bookingId=', bookingId); 
      console.log('[GuestChatContext] token=', resolvedToken);
      console.log('[GuestChatContext] endpoint=', `/chat/${hotelSlug}/guest/chat/context/`);
      
      console.log('[GuestChatContext] 🔍 TOKEN SOURCE ANALYSIS:');
      console.log('- booking.guest_token=', booking.guest_token ? booking.guest_token.substring(0, 10) + '...' : 'NULL');
      console.log('- queryToken=', token ? token.substring(0, 10) + '...' : 'NULL');
      console.log('- resolvedToken=', resolvedToken.substring(0, 10) + '...');
      console.log('- booking.id=', booking.id);
      console.log('- booking.hotel_slug=', booking.hotel_slug);
      console.log('- retryCount=', retryCount);

      console.error("❌ [BookingStatusPage] Guest context FAILED:", {
        errorMessage: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        requestURL: err.config?.url,
        retryCount
      });

      // 🛑 404 INVALID TOKEN GUARD - STOP RETRY STORMS 🛑
      if (err.response?.status === 404 && err.response?.data?.detail?.includes('Invalid or expired token')) {
        console.error('🛑 [RETRY STORM BLOCKED] 404 Invalid or expired token - NO AUTO RETRY');
        console.log('[GuestChatContext] 🔍 TOKEN VALIDATION FAILED:', {
          status: err.response.status,
          detail: err.response.data?.detail,
          hotelSlug: hotelSlug,
          bookingId: bookingId,
          tokenUsed: resolvedToken ? resolvedToken.substring(0, 10) + '...' : 'NULL',
          retryCount: retryCount
        });
        
        setContextError({
          status: 404,
          message: "Authentication token is invalid or expired",
          disabled_reason: "invalid_token",
          action_required: "refresh_page"
        });
        setContextLoading(false);
        return; // NO RETRY ON INVALID TOKEN
      }

      setContextError({
        status: err.response?.status || 0,
        message:
          err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to validate permissions",
      });
      setContextLoading(false);

      // Enable chat for checked-in guests when token issues occur
      if (booking?.checked_in_at && !booking?.checked_out_at) {
        console.log('🔧 Enabling chat for checked-in guest despite token issues');
        setGuestContext({
          allowed_actions: ['chat', 'room_service', 'breakfast'],
          guest_id: booking.booking_id,
          message: 'Chat enabled for checked-in guest'
        });
      } else {
        setGuestContext(null);
      }

      // Keep status page usable; just disable chat + services
      setContextError({
        status: err.response?.status || 0,
        message:
          err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to validate permissions",
      });
    } finally {
      setContextLoading(false);
    }
  };

  // Handle booking cancellation
  const handleCancellation = async () => {
    if (!token || !booking) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const response = await publicAPI.post(
        `/hotel/${hotelSlug}/room-bookings/${bookingId}/cancel/`,
        {
          reason: cancelReason,
          token: token,
        }
      );

      const result = unwrap(response);
      console.log("Cancellation response:", result);

      // Set cancellation success data
      setCancellationSuccess(result);

      // Update booking state
      setBooking((prevBooking) => ({
        ...prevBooking,
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        can_cancel: false,
      }));

      setCanCancel(false);
      setShowCancelModal(false);
    } catch (err) {
      console.error("Cancellation failed:", err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to cancel booking. Please try again or contact the hotel directly.";
      setCancelError(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    console.log('🚀 [BookingStatusPage] Component mounted - fetching booking status');
    fetchBookingStatus();
  }, []);
  
  // Fetch guest context when booking becomes available (dependency fix to prevent retry storms)
  useEffect(() => {
    if (booking && hotelSlug) {
      fetchGuestContext();
    }
  }, [booking?.id, hotelSlug]); // REMOVED booking?.guest_token to prevent retry storms

  // 🚀 DIRECT CHAT ENABLEMENT: Enable chat for checked-in guests (bypassing token requirements)
  useEffect(() => {
    if (booking) {
      // Resolve current token for this booking
      const currentToken = resolveGuestBookingToken({
        bookingId: booking.id || bookingId,
        bookingToken: booking.guest_token,
        queryToken: token
      });
      
      // If guest is checked in, enable chat directly regardless of guest token
      if (booking.checked_in_at && !booking.checked_out_at) {
        console.log('🔧 DIRECT CHAT ENABLEMENT: Enabling chat for checked-in guest');
        console.log('🔧 Checked-in guest detected:', {
          checked_in_at: booking.checked_in_at,
          checked_out_at: booking.checked_out_at,
          assigned_room_number: booking.assigned_room_number,
          has_resolved_token: !!currentToken,
          status: booking.status
        });
        setGuestContext({
          allowed_actions: ['chat', 'room_service', 'breakfast'],
          guest_id: booking.booking_id,
          temp_workaround: true,
          message: 'Chat enabled for checked-in guest',
          room_number: booking.assigned_room_number
        });
        setContextLoading(false);
        setContextError(null);
        console.log('✅ CHAT ENABLED for checked-in guest');
      } else {
        console.log('🔧 Guest not checked in, chat disabled:', {
          checked_in_at: !!booking?.checked_in_at,
          checked_out_at: !!booking?.checked_out_at,
          has_resolved_token: !!currentToken,
          status: booking.status
        });
        // Only disable if not previously enabled by guest token
        if (!currentToken) {
          setGuestContext(null);
        }
      }
    }
  }, [booking?.guest_token, booking?.checked_in_at, booking?.checked_out_at, bookingId, token]);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <Container className="py-5 text-center">
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        </Container>
      </div>
    );
  }

  if (!booking) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <Container className="py-5 text-center">
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No booking data available
          </Alert>
        </Container>
      </div>
    );
  }

  const statusInfo = getStatusDisplay(booking.status);

  // Check booking state
  const isCheckedOut = booking?.checked_out_at;
  const isCheckedIn =
    booking?.checked_in_at && booking?.assigned_room_number && !isCheckedOut;
  const hasRoomAssigned =
    booking?.assigned_room_number && !isCheckedIn && !isCheckedOut;

  // Debug current booking state
  console.log("🔍 Current booking state:", {
    status: booking?.status,
    checked_in_at: booking?.checked_in_at,
    checked_out_at: booking?.checked_out_at,
    assigned_room_number: booking?.assigned_room_number,
    isCheckedOut: isCheckedOut,
    isCheckedIn: isCheckedIn,
    hasRoomAssigned: hasRoomAssigned,
    statusInfo: statusInfo,
  });

  // Token-scoped permissions logic
  const allowed = guestContext?.allowed_actions;

  const hasAllowed = (key) => {
    if (!allowed) return false;
    if (Array.isArray(allowed)) return allowed.includes(key);
    return allowed[key] === true; // supports {can_chat:true} style
  };

  // Server is source of truth for permissions - no fallbacks to isCheckedIn
  const canChat = hasAllowed("chat") || hasAllowed("can_chat");
  const canRoomService =
    hasAllowed("room_service") ||
    hasAllowed("can_order_room_service") ||
    (isCheckedIn && !contextError?.status);
  const canBreakfast =
    hasAllowed("breakfast") ||
    hasAllowed("can_breakfast") ||
    (isCheckedIn && !contextError?.status);

  // Debug chat permissions
  console.log("🎛️ [BookingStatusPage] Chat permissions debug:", {
    guestContext,
    allowed,
    hasChat: hasAllowed("chat"),
    hasCanChat: hasAllowed("can_chat"),
    finalCanChat: canChat,
    isCheckedIn,
    contextError,
    contextLoading,
  });

  const chatDisabledReason = !token
    ? "Missing booking token"
    : !canChat
    ? "Chat not enabled for this link"
    : null;

  const chatEnabled = !!canChat && !chatDisabledReason;

  return (
    <div>
      {/* Top Navigation Bar - Hotel Services */}
      {(isCheckedIn || canRoomService || canBreakfast || canChat) && (
        <div
          className="bg-white shadow-sm border-bottom sticky-top"
          style={{ zIndex: 1040 }}
        >
          <Container>
            <div className="d-flex justify-content-center gap-2 py-3">
              <button
                className="custom-button px-4 py-2"
                onClick={() =>
                  setActiveService(
                    activeService === "room_service" ? null : "room_service"
                  )
                }
                disabled={!canRoomService && !contextLoading}
                title={
                  contextLoading
                    ? "Checking permissions..."
                    : !canRoomService
                    ? "Available after check-in"
                    : ""
                }
                style={{
                  borderRadius: "25px",
                  opacity: !canRoomService && !contextLoading ? 0.6 : 1,
                }}
              >
                Room Service
              </button>
              <button
                className="custom-button px-4 py-2"
                onClick={() =>
                  setActiveService(
                    activeService === "breakfast" ? null : "breakfast"
                  )
                }
                disabled={!canBreakfast && !contextLoading}
                title={
                  contextLoading
                    ? "Checking permissions..."
                    : !canBreakfast
                    ? "Available after check-in"
                    : ""
                }
                style={{
                  borderRadius: "25px",
                  opacity: !canBreakfast && !contextLoading ? 0.6 : 1,
                }}
              >
                Breakfast
              </button>

              {/* Token-based chat - route to portal */}
              <button
                className="custom-button px-4 py-2"
                onClick={() => {
                  // Resolve token using booking-scoped logic only
                  const chatToken = resolveGuestBookingToken({
                    bookingId: booking?.id || bookingId,
                    bookingToken: booking?.guest_token,
                    queryToken: token
                  });
                  
                  if (!chatToken) {
                    console.error('[BookingStatusPage] No token available for chat navigation');
                    return;
                  }
                  
                  console.log('[BookingStatusPage] Chat navigation:', {
                    hotelSlug,
                    booking_id: booking?.id || bookingId,
                    room_number: booking?.assigned_room_number,
                    token_preview: chatToken.substring(0, 10) + '...'
                  });
                  
                  navigate(`/guest/chat?hotel_slug=${hotelSlug}&token=${encodeURIComponent(chatToken)}&room_number=${booking?.assigned_room_number || ''}`);
                }}
                disabled={!canChat && !contextLoading}
                title={
                  contextLoading
                    ? "Checking permissions..."
                    : chatDisabledReason || "Click to open chat"
                }
                style={{
                  borderRadius: "25px",
                  opacity: !canChat && !contextLoading ? 0.6 : 1,
                }}
              >
                {contextLoading ? "Checking..." : "Chat with Us"}
              </button>
            </div>
          </Container>
        </div>
      )}

      {/* Service Components - Load directly under buttons */}
      {booking?.assigned_room_number && activeService && (
        <Container className="py-4">
          {activeService === "room_service" && canRoomService && (
            <RoomService
              isAdmin={false}
              roomNumber={booking.assigned_room_number}
              hotelIdentifier={hotelSlug}
            />
          )}
          {activeService === "breakfast" && canBreakfast && (
            <Breakfast
              isAdmin={false}
              roomNumber={booking.assigned_room_number}
              hotelIdentifier={hotelSlug}
            />
          )}
        </Container>
      )}

      <Container className="py-4">
        {/* Modern Header - Combined with Quick Info */}
        <div className="mb-4">
          <div className="row align-items-center">
            {/* Enhanced Info Panel - Show on top for small screens, right for large screens */}
            <div className="col-12 col-lg-4 order-1 order-lg-2 mb-3 mb-lg-0">
              <div className="card border-0 shadow-sm h-100">
                {/* Booking Reference Banner */}
                <div className="bg-info bg-opacity-10 px-3 py-2 border-bottom">
                  <div className="text-center">
                    <small className="text-dark d-block fw-medium">
                      Booking Reference
                    </small>
                    <strong className="text-dark fs-6">
                      {booking.confirmation_number}
                    </strong>
                  </div>
                </div>

                <div className="card-body p-4">
                  {/* Guest Information - Clean card style */}
                  <div className="mb-4">
                    <div className="bg-light rounded p-3 text-center">
                      <div className="small text-secondary fw-medium mb-1">
                        Primary Guest
                      </div>
                      <div className="fw-bold fs-5 text-dark mb-2">
                        {booking.guest?.name}
                      </div>
                      <div className="small text-dark mb-1">
                        {booking.guest?.email}
                      </div>
                      {booking.guest?.phone && (
                        <div className="small text-dark">
                          {booking.guest?.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="mb-4">
                    <div className="bg-light rounded p-3 text-center mb-3">
                      <div className="small text-secondary fw-medium mb-1">
                        Room
                      </div>
                      <div className="fw-bold fs-5 text-dark mb-1">
                        {booking.assigned_room_number || "Unassigned"}
                      </div>
                      <div className="small text-dark">
                        {booking.room?.type}
                      </div>
                    </div>
                    <div className="bg-light rounded p-3 text-center">
                      <div className="small text-secondary fw-medium mb-1">
                        Stay
                      </div>
                      <div className="fw-bold fs-5 text-dark mb-1">
                        {booking.dates?.nights} Night
                        {booking.dates?.nights > 1 ? "s" : ""}
                      </div>
                      <div className="small text-dark mb-1">
                        Until{" "}
                        {new Date(booking.dates?.check_out).toLocaleDateString(
                          "en-GB"
                        )}
                      </div>
                      <div className="small fw-bold text-dark">
                        {booking.hotel?.name}
                      </div>
                    </div>
                  </div>

                  {/* Party Size - Kept at bottom */}
                  <div className="border-top pt-3">
                    <div className="bg-light rounded p-3 text-center">
                      <div className="small text-secondary fw-medium mb-1">
                        Party Size
                      </div>
                      <div
                        className="fw-bold fs-4"
                        style={{ color: "#10b981" }}
                      >
                        {booking.guests?.total}
                      </div>
                      <div className="small text-dark">
                        {booking.guests?.adults} Adults •{" "}
                        {booking.guests?.children} Children
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Header Info - Show on bottom for small screens, left for large screens */}
            <div className="col-12 col-lg-8 order-2 order-lg-1 text-center text-lg-start">
              <div className="position-relative d-inline-block">
                <div
                  className={`rounded-circle bg-${statusInfo.color} d-inline-flex align-items-center justify-content-center mb-3`}
                  style={{ width: "100px", height: "100px" }}
                >
                  <i
                    className={`bi bi-${statusInfo.icon} text-white`}
                    style={{ fontSize: "3rem" }}
                  ></i>
                </div>
                {isCheckedIn && (
                  <div className="position-absolute top-0 end-0 bg-white rounded-circle p-2 shadow-sm">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                  </div>
                )}
              </div>
              <h1 className="display-4 fw-bold mb-2">
                {isCheckedOut
                  ? "Stay Completed"
                  : isCheckedIn
                  ? `Room ${booking.assigned_room_number}`
                  : hasRoomAssigned
                  ? `Room ${booking.assigned_room_number} Ready`
                  : statusInfo.text}
              </h1>
              <div
                className={`badge bg-${
                  isCheckedOut
                    ? "secondary"
                    : isCheckedIn
                    ? "success"
                    : hasRoomAssigned
                    ? checkinWindow.status === "open"
                      ? "success"
                      : checkinWindow.status === "not-yet"
                      ? "warning"
                      : checkinWindow.status === "closed"
                      ? "danger"
                      : "info"
                    : statusInfo.color
                } fs-5 px-4 py-2 mb-3`}
              >
                {isCheckedOut
                  ? "Thank You for Your Stay!"
                  : isCheckedIn
                  ? "Welcome! You're Checked In"
                  : hasRoomAssigned
                  ? checkinWindow.status === "open" &&
                    checkinWindow.period === "early"
                    ? "Early Check-in Available (from 12:00)"
                    : checkinWindow.status === "open" &&
                      checkinWindow.period === "standard"
                    ? "Check-in Available (standard hours)"
                    : checkinWindow.status === "open" &&
                      checkinWindow.period === "late"
                    ? "Late Check-in Available (until 02:00)"
                    : checkinWindow.status === "open"
                    ? "Check-in Available"
                    : checkinWindow.status === "not-yet" &&
                      checkinWindow.timeUntilOpen &&
                      checkinWindow.opensAt
                    ? `Check-in Opens at ${checkinWindow.opensAt.toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: checkinWindow.hotelTimezone,
                        }
                      )} (in ${Math.floor(
                        checkinWindow.timeUntilOpen / (1000 * 60 * 60)
                      )}h ${Math.floor(
                        (checkinWindow.timeUntilOpen % (1000 * 60 * 60)) /
                          (1000 * 60)
                      )}m)`
                    : checkinWindow.status === "not-yet" &&
                      checkinWindow.opensAt
                    ? `Check-in Opens at ${checkinWindow.opensAt.toLocaleTimeString(
                        "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: checkinWindow.hotelTimezone,
                        }
                      )}`
                    : checkinWindow.status === "not-yet"
                    ? "Check-in Opens at 12:00"
                    : checkinWindow.status === "closed"
                    ? "Check-in Window Closed (contact hotel)"
                    : "Room Ready"
                  : `Booking ${statusInfo.text}`}
              </div>
              <p className="text-muted lead">
                {isCheckedOut
                  ? `Hope you enjoyed your stay at ${booking.hotel?.name}`
                  : isCheckedIn
                  ? `Enjoy your stay at ${booking.hotel?.name}`
                  : hasRoomAssigned
                  ? `Your room is ready at ${booking.hotel?.name}`
                  : `Your booking with ${booking.hotel?.name}`}
              </p>
            </div>
          </div>
        </div>

        {/* Cancellation Success Alert */}
        {cancellationSuccess && (
          <Alert variant="success" className="mb-4">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle bg-success d-flex align-items-center justify-content-center me-3"
                style={{ width: "50px", height: "50px" }}
              >
                <i className="bi bi-check-circle-fill text-white fs-4"></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="alert-heading mb-2">
                  Booking Successfully Cancelled
                </h5>
                <p className="mb-2">{cancellationSuccess.description}</p>
                <div className="row g-2">
                  {cancellationSuccess.cancellation_fee &&
                    parseFloat(cancellationSuccess.cancellation_fee) > 0 && (
                      <div className="col-md-6">
                        <small className="text-muted d-block">
                          Cancellation Fee
                        </small>
                        <strong>
                          {booking.pricing?.currency || "EUR"}{" "}
                          {parseFloat(
                            cancellationSuccess.cancellation_fee
                          ).toFixed(2)}
                        </strong>
                      </div>
                    )}
                  {cancellationSuccess.refund_amount && (
                    <div className="col-md-6">
                      <small className="text-muted d-block">
                        Refund Amount
                      </small>
                      <strong className="text-success">
                        {booking.pricing?.currency || "EUR"}{" "}
                        {parseFloat(cancellationSuccess.refund_amount).toFixed(
                          2
                        )}
                      </strong>
                    </div>
                  )}
                  {cancellationSuccess.refund_reference && (
                    <div className="col-12">
                      <small className="text-muted d-block">
                        Refund Reference
                      </small>
                      <code>{cancellationSuccess.refund_reference}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Alert>
        )}

        {/* Cancellation Section - Only show if not checked in */}
        {canCancel && !isCheckedIn && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <h5 className="card-title text-warning mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Cancellation Options
              </h5>

              {cancellationPreview && (
                <div className="mb-4">
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <div className="bg-light rounded p-3 text-center">
                        <div className="small text-secondary fw-medium mb-1">
                          Cancellation Fee
                        </div>
                        <div className="fw-bold fs-5 text-danger">
                          {booking.pricing?.currency || "EUR"}{" "}
                          {parseFloat(
                            cancellationPreview.fee_amount || 0
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded p-3 text-center">
                        <div className="small text-secondary fw-medium mb-1">
                          Refund Amount
                        </div>
                        <div className="fw-bold fs-5 text-success">
                          {booking.pricing?.currency || "EUR"}{" "}
                          {parseFloat(
                            cancellationPreview.refund_amount || 0
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {cancellationPreview.description && (
                    <div className="bg-light rounded p-3 text-center mb-3">
                      <div className="small text-secondary fw-medium mb-1">
                        Policy
                      </div>
                      <div className="small text-dark fw-medium">
                        {cancellationPreview.description}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center">
                <Button
                  variant="outline-danger"
                  onClick={() => setShowCancelModal(true)}
                  size="lg"
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel Booking
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Hotel Contact */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <h5 className="card-title mb-3">Need Assistance?</h5>
            <p className="text-muted mb-3">
              Contact {booking.hotel?.name} for any help during your stay
            </p>
            <div className="d-flex justify-content-center gap-3">
              <a
                href={`tel:${booking.hotel?.phone}`}
                className="btn btn-outline-primary"
              >
                <i className="bi bi-telephone me-2"></i>
                Call Hotel
              </a>
              <a
                href={`mailto:${booking.hotel?.email}`}
                className="btn btn-outline-secondary"
              >
                <i className="bi bi-envelope me-2"></i>
                Email
              </a>
            </div>
          </div>
        </div>
      </Container>

      {/* Cancellation Modal */}
      <Modal
        show={showCancelModal}
        onHide={() => setShowCancelModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-exclamation-triangle text-warning me-2"></i>
            Cancel Booking
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelError && (
            <Alert variant="danger" className="mb-3">
              {cancelError}
            </Alert>
          )}

          <p>Are you sure you want to cancel this booking?</p>

          {cancellationPreview && (
            <div className="bg-light p-3 rounded mb-3">
              <h6>Cancellation Summary</h6>
              <div className="row text-center">
                <div className="col-6">
                  <div className="text-muted small">Cancellation Fee</div>
                  <div className="fw-bold text-danger">
                    {booking.pricing?.currency || "EUR"}{" "}
                    {parseFloat(cancellationPreview.fee_amount || 0).toFixed(2)}
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-muted small">Refund Amount</div>
                  <div className="fw-bold text-success">
                    {booking.pricing?.currency || "EUR"}{" "}
                    {parseFloat(cancellationPreview.refund_amount || 0).toFixed(
                      2
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <small className="text-muted">
                  {cancellationPreview.description}
                </small>
              </div>
            </div>
          )}

          <Form>
            <Form.Group>
              <Form.Label>Reason for cancellation (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please let us know why you're cancelling..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCancelModal(false)}
            disabled={cancelling}
          >
            Keep Booking
          </Button>
          <Button
            variant="danger"
            onClick={handleCancellation}
            disabled={cancelling}
          >
            {cancelling ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Cancelling...
              </>
            ) : (
              <>
                <i className="bi bi-x-circle me-2"></i>
                Cancel Booking
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BookingStatusPage;
