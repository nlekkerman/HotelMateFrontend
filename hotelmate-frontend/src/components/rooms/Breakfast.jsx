import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "@/services/api";
import ViewOrders from "@/components/rooms/ViewOrders";
import { useRoomServiceState } from "@/realtime/stores/roomServiceStore.jsx";
import "./Breakfast.css";

const TIME_SLOTS = [
  "7:00-8:00",
  "8:00-8:30",
  "8:30-9:00",
  "9:00-9:30",
  "9:30-10:00",
  "10:00-10:30",
];

const Breakfast = ({
  isAdmin = false,
  roomNumber: propRoomNumber,
  hotelIdentifier: propHotelIdentifier,
}) => {
  const params = useParams();
  const roomNumber = propRoomNumber || params.roomNumber;
  const hotelIdentifier = propHotelIdentifier || params.hotelIdentifier;
  const [items, setItems] = useState([]);
  const [orderQtyById, setOrderQtyById] = useState({}); // { itemId: quantity }
  const [orderNotes, setOrderNotes] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  
  // Single-screen filter state
  const [activeCategory, setActiveCategory] = useState("All");
  const [timePanelOpen, setTimePanelOpen] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  
  const categoryRefs = useRef({});
  const timePanelRef = useRef(null);

  // Use room service store for real-time updates
  const roomServiceState = useRoomServiceState();

  // Derived values
  const selectedItemsList = items.filter(
    (item) => (orderQtyById[item.id] || 0) > 0
  );
  const totalCount = Object.values(orderQtyById).reduce(
    (sum, qty) => sum + (qty || 0),
    0
  );

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // Define category order for display
  const categoryOrder = [
    "Mains",
    "Hot Buffet",
    "Cold Buffet",
    "Breads",
    "Condiments",
    "Drinks",
    "Other",
  ];
  const availableCategories = ["All", ...categoryOrder.filter(
    (cat) => groupedItems[cat]?.length > 0
  )];

  // Get filtered items based on active category
  const filteredItems = activeCategory === "All" 
    ? categoryOrder.flatMap(cat => groupedItems[cat] || [])
    : groupedItems[activeCategory] || [];

  // Fetch breakfast items
  useEffect(() => {
    api
      .get(`room_services/${hotelIdentifier}/room/${roomNumber}/breakfast/`)
      .then((res) => {
        const formatted = res.data.map((item) => ({ ...item, quantity: 1 }));
        setItems(formatted);
      })
      .catch((err) => {
        console.error("Failed to fetch breakfast items:", err);
      });
  }, [roomNumber]);

  // Monitor room service store for real-time breakfast order updates
  useEffect(() => {
    if (!roomServiceState) return;

    // Get breakfast orders for this room from the store
    const roomBreakfastOrders = Object.values(roomServiceState.ordersById)
      .filter(
        (order) =>
          (order.type === "breakfast" || order.breakfast_order === true) &&
          order.room_number === parseInt(roomNumber) &&
          order.hotel_identifier === hotelIdentifier
      )
      .sort(
        (a, b) =>
          new Date(b.created_at || b.timestamp) -
          new Date(a.created_at || a.timestamp)
      );

    // Update local orders state with real-time data
    if (roomBreakfastOrders.length > 0) {
      setOrders(roomBreakfastOrders);

      // Show notifications for status changes
      roomBreakfastOrders.forEach((order) => {
        if (order.status && order.updated_at) {
          const updatedTime = new Date(order.updated_at);
          const now = new Date();
          const timeDiff = now - updatedTime;

          // Show notification if order was updated within the last 30 seconds
          if (timeDiff < 30000) {
            const statusMessages = {
              pending: "⏳ Your breakfast order is being reviewed",
              accepted: "✅ Great! Your breakfast order is being prepared",
              completed: "🎉 Your breakfast is ready for delivery!",
            };

            const message =
              statusMessages[order.status] ||
              `Breakfast order status: ${order.status}`;
            const toastType = order.status === "completed" ? "success" : "info";

            toast[toastType](message, {
              autoClose: order.status === "completed" ? 6000 : 5000,
              position: "top-center",
            });

            // Play sound for completed breakfast orders
            if (order.status === "completed") {
              try {
                const audio = new Audio("/notification.mp3");
                audio.volume = 0.6;
                audio.play().catch(() => {
                  // Autoplay might be blocked
                });
              } catch (err) {
                // Error playing sound
              }
            }
          }
        }
      });
    }
  }, [roomServiceState, roomNumber, hotelIdentifier]);

  // Quantity handlers
  const incrementQty = (itemId) => {
    setOrderQtyById((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const decrementQty = (itemId) => {
    setOrderQtyById((prev) => {
      const newQty = Math.max(0, (prev[itemId] || 0) - 1);
      if (newQty === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  // Filter and navigation handlers
  const selectCategory = (category) => {
    setActiveCategory(category);
  };

  const selectTime = (slot) => {
    setTimeSlot(slot);
    setTimePanelOpen(false);
  };

  const openReview = () => {
    setShowReview(true);
  };

  const closeReview = () => {
    setShowReview(false);
  };

  // Click outside handler for time panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timePanelRef.current && !timePanelRef.current.contains(event.target)) {
        setTimePanelOpen(false);
      }
    };

    if (timePanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [timePanelOpen]);

  // Submit order
  const handleSubmit = async () => {
    setLoading(true);

    const itemsPayload = selectedItemsList.map((item) => ({
      item_id: item.id,
      quantity: orderQtyById[item.id],
    }));

    const payload = {
      room_number: parseInt(roomNumber),
      delivery_time: timeSlot || undefined,
      items: itemsPayload,
    };

    try {
      const response = await api.post(
        `/room_services/${hotelIdentifier}/breakfast-orders/`,
        payload
      );

      // Integrate with real-time store for proper Pusher updates
      const newBreakfastOrder = {
        ...response.data,
        type: "breakfast",
        breakfast_order: true,
        hotel_identifier: hotelIdentifier,
        room_number: parseInt(roomNumber),
      };

      toast.success(
        `Breakfast order #${response.data.id} submitted successfully! You'll receive updates as it's prepared.`,
        {
          autoClose: 4000,
          position: "top-center",
        }
      );

      setSubmitted(true);
      setOrderQtyById({});
      setOrderNotes("");
      setTimeSlot("");
      closeReview(); // Close review sheet
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to submit order";
      alert(errorMsg);
      console.error("Order submission error:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };
  // Fetch existing orders for this room + hotel
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await api.get(
        `/room_services/${hotelIdentifier}/breakfast-orders/`,
        { params: { room_number: roomNumber } }
      );
      setOrders(response.data.results);
      setShowOrders(true);
    } catch (error) {
      alert("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };
  return (
    <>
      {/* Single-Screen Breakfast Page */}
      <div className="bf-page">
        {/* Header */}
        <div className="bf-header">
          <h1 className="bf-header-title">Breakfast · Room {roomNumber}</h1>
          <p className="bf-header-subtitle">
            {timeSlot || "No time selected"}
          </p>
        </div>

        {/* View Orders Toggle */}
        <div className="bf-actions">
          <button
            onClick={() => {
              if (!showOrders) fetchOrders();
              setShowOrders(!showOrders);
            }}
            className="bf-btn bf-btn-secondary"
          >
            {showOrders ? "Hide" : "View"} Your Breakfast Orders
          </button>

          {loadingOrders && (
            <div className="bf-loading">Loading orders...</div>
          )}
        </div>

        {/* Show Orders */}
        {showOrders && !loadingOrders && (
          <div className="bf-orders-section">
            <ViewOrders orders={orders} />
          </div>
        )}

        {/* Time Selector */}
        <div className="bf-time-section" ref={timePanelRef}>
          <button
            onClick={() => setTimePanelOpen(!timePanelOpen)}
            className={`bf-time-selector ${!timeSlot ? 'bf-time-selector-empty' : ''}`}
          >
            {timeSlot ? `Delivery time: ${timeSlot}` : "Select delivery time"}
          </button>
          
          {timePanelOpen && (
            <div className="bf-time-dropdown">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => selectTime(slot)}
                  className={`bf-time-dropdown-option ${timeSlot === slot ? 'active' : ''}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Filter Section */}
        <div className="bf-filter-section">
          {/* Mobile Dropdown Filter - Always Visible */}
          <div className="bf-filter-mobile-only">
            <div className="bf-filter-dropdown">
              <select
                value={activeCategory}
                onChange={(e) => selectCategory(e.target.value)}
                className="bf-filter-select"
              >
                {availableCategories.map((category) => {
                  const itemCount = category === "All" 
                    ? items.length 
                    : groupedItems[category]?.length || 0;
                  
                  return (
                    <option key={category} value={category}>
                      {category} ({itemCount} items)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Desktop Horizontal Filter Bar - Always Visible */}
          <div className="bf-filter-desktop-only">
            <div className="bf-filter-bar">
              {availableCategories.map((category) => {
                const itemCount = category === "All" 
                  ? items.length 
                  : groupedItems[category]?.length || 0;
                
                return (
                  <button
                    key={category}
                    onClick={() => selectCategory(category)}
                    className={`bf-filter-pill ${activeCategory === category ? 'active' : ''}`}
                  >
                    {category}
                    {itemCount > 0 && (
                      <span className="bf-filter-badge">{itemCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Item List */}
        <div className="bf-item-container">
          {filteredItems.length > 0 ? (
            <div className="bf-item-list-inline">
              {filteredItems.map((item) => {
                const isOutOfStock = item.is_on_stock === false;
                const currentQty = orderQtyById[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className={`bf-item-row-inline ${isOutOfStock ? 'disabled' : ''}`}
                  >
                    <div className="bf-item-content">
                      <h4 className="bf-item-name">{item.name}</h4>
                      <p className="bf-item-description">{item.description}</p>
                    </div>

                    <div className="bf-item-controls">
                      {isOutOfStock ? (
                        <div className="bf-unavailable-inline">Unavailable</div>
                      ) : (
                        <div className="bf-stepper-inline">
                          <button
                            onClick={() => decrementQty(item.id)}
                            disabled={currentQty === 0}
                            className="bf-stepper-btn-inline"
                          >
                            −
                          </button>
                          <span className="bf-stepper-qty-inline">{currentQty}</span>
                          <button
                            onClick={() => incrementQty(item.id)}
                            className="bf-stepper-btn-inline bf-stepper-btn-primary-inline"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bf-empty-state">
              <p>No items available in this category</p>
            </div>
          )}
        </div>

        {/* Need Assistance */}
        <div className="bf-assistance">
          <button
            onClick={() => setShowPolicy(true)}
            className="bf-assistance-btn"
          >
            Need assistance? View pricing policy
          </button>
        </div>
      </div>

      {/* Sticky Bottom Cart */}
      {totalCount > 0 && (
        <div className="bf-sticky-cart">
          <div className="bf-sticky-cart-info">
            <span className="bf-cart-count">{totalCount} items selected</span>
          </div>
          <button onClick={openReview} className="bf-cart-btn">
            Review Order
          </button>
        </div>
      )}

      {/* Review Bottom Sheet */}
      {showReview && (
        <div className="bf-review-backdrop" onClick={closeReview}>
          <div className="bf-review-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bf-review-header">
              <h3 className="bf-review-title">Review Your Order</h3>
              <button onClick={closeReview} className="bf-review-close">
                ✕
              </button>
            </div>
            
            <div className="bf-review-content">
              {/* Selected Time */}
              {timeSlot && (
                <div className="bf-review-time-section">
                  <div className="bf-review-time-label">Delivery Time</div>
                  <div className="bf-review-time-value">{timeSlot}</div>
                </div>
              )}

              {/* Selected Items */}
              <div className="bf-review-items-section">
                <h4 className="bf-review-items-title">
                  Selected Items ({totalCount})
                </h4>
                <div className="bf-review-items-list">
                  {selectedItemsList.map((item) => (
                    <div key={item.id} className="bf-review-item-row">
                      <div className="bf-review-item-details">
                        <div className="bf-review-item-name">{item.name}</div>
                        <div className="bf-review-item-desc">{item.description}</div>
                      </div>
                      <div className="bf-review-item-stepper">
                        <button
                          onClick={() => decrementQty(item.id)}
                          className="bf-review-stepper-btn"
                        >
                          −
                        </button>
                        <span className="bf-review-stepper-qty">{orderQtyById[item.id]}</span>
                        <button
                          onClick={() => incrementQty(item.id)}
                          className="bf-review-stepper-btn bf-review-stepper-btn-primary"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div className="bf-review-notes-section">
                <h4 className="bf-review-notes-title">
                  Special Instructions (Optional)
                </h4>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special requests or dietary requirements..."
                  className="bf-review-notes-textarea"
                />
              </div>

              {/* Pricing Link */}
              <button
                onClick={() => setShowPolicy(true)}
                className="bf-review-policy-link"
              >
                Breakfast pricing information
              </button>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || totalCount === 0 || !timeSlot}
                className="bf-review-submit-btn"
              >
                {loading ? "Submitting..." : "Submit Breakfast Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicy && (
        <div className="bf-modal-backdrop" onClick={() => setShowPolicy(false)}>
          <div
            className="bf-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "28rem" }}
          >
            <div className="bf-modal-header">
              <h3 className="bf-modal-title">Breakfast Pricing</h3>
              <button onClick={() => setShowPolicy(false)} className="bf-modal-close">
                ✕
              </button>
            </div>
            <div style={{ padding: "1rem" }}>
              <p style={{
                fontSize: "0.875rem",
                color: "#374151",
                lineHeight: "1.5",
                marginBottom: "1.5rem",
              }}>
                If you do not have included breakfast you will be charged{" "}
                <strong>17.50 Euro</strong> for Adult and{" "}
                <strong>12.50 Euro</strong> for a child. By sending this order
                you agree with the stated above.
              </p>
              <button
                onClick={() => setShowPolicy(false)}
                className="bf-btn bf-btn-primary"
                style={{ width: '100%' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {submitted && (
        <div className="bf-success">
          Order submitted successfully!
        </div>
      )}
    </>
  );
};

export default Breakfast;
