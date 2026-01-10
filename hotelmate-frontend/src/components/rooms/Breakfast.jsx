import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "@/services/api";
import ViewOrders from "@/components/rooms/ViewOrders";
import { useRoomServiceState } from "@/realtime/stores/roomServiceStore.jsx";

const TIME_SLOTS = [
  "7:00-8:00",
  "8:00-8:30", 
  "8:30-9:00",
  "9:00-9:30",
  "9:30-10:00",
  "10:00-10:30",
];

const Breakfast = ({ isAdmin = false, roomNumber: propRoomNumber, hotelIdentifier: propHotelIdentifier }) => {
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
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const categoryRefs = useRef({});
  
  // Use room service store for real-time updates
  const roomServiceState = useRoomServiceState();

  // Derived values
  const selectedItemsList = items.filter(item => (orderQtyById[item.id] || 0) > 0);
  const totalCount = Object.values(orderQtyById).reduce((sum, qty) => sum + (qty || 0), 0);

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // Define category order for display
  const categoryOrder = ["Mains", "Hot Buffet", "Cold Buffet", "Breads", "Condiments", "Drinks", "Other"];
  const availableCategories = categoryOrder.filter(cat => groupedItems[cat]?.length > 0);

  // Fetch breakfast items
  useEffect(() => {
    api
      .get(`room_services/${hotelIdentifier}/room/${roomNumber}/breakfast/`)
      .then((res) => {
        const formatted = res.data.map((item) => ({ ...item, quantity: 1 }));
        setItems(formatted);
        // Set first available category as active by default
        if (formatted.length > 0) {
          const firstCategory = categoryOrder.find(cat => 
            formatted.some(item => (item.category || "Other") === cat)
          );
          if (firstCategory) {
            setActiveCategory(firstCategory);
          }
        }
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
      .filter(order => 
        (order.type === 'breakfast' || order.breakfast_order === true) && 
        order.room_number === parseInt(roomNumber) &&
        order.hotel_identifier === hotelIdentifier
      )
      .sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));

    // Update local orders state with real-time data
    if (roomBreakfastOrders.length > 0) {
      setOrders(roomBreakfastOrders);
      
      // Show notifications for status changes
      roomBreakfastOrders.forEach(order => {
        if (order.status && order.updated_at) {
          const updatedTime = new Date(order.updated_at);
          const now = new Date();
          const timeDiff = now - updatedTime;
          
          // Show notification if order was updated within the last 30 seconds
          if (timeDiff < 30000) {
            const statusMessages = {
              'pending': '⏳ Your breakfast order is being reviewed',
              'accepted': '✅ Great! Your breakfast order is being prepared',
              'completed': '🎉 Your breakfast is ready for delivery!'
            };
            
            const message = statusMessages[order.status] || `Breakfast order status: ${order.status}`;
            const toastType = order.status === 'completed' ? 'success' : 'info';
            
            toast[toastType](message, {
              autoClose: order.status === 'completed' ? 6000 : 5000,
              position: 'top-center'
            });

            // Play sound for completed breakfast orders
            if (order.status === 'completed') {
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
    setOrderQtyById(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const decrementQty = (itemId) => {
    setOrderQtyById(prev => {
      const newQty = Math.max(0, (prev[itemId] || 0) - 1);
      if (newQty === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  // Category selection for modal
  const selectCategory = (category) => {
    setActiveCategory(category);
  };

  // Open menu modal
  const openMenuModal = () => {
    setShowMenuModal(true);
    // Set first category as active if none selected
    if (!activeCategory && availableCategories.length > 0) {
      setActiveCategory(availableCategories[0]);
    }
  };

  // Submit order
  const handleSubmit = async () => {
    setLoading(true);

    const itemsPayload = selectedItemsList.map(item => ({
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
        type: 'breakfast',
        breakfast_order: true,
        hotel_identifier: hotelIdentifier,
        room_number: parseInt(roomNumber)
      };
      
      toast.success(`Breakfast order #${response.data.id} submitted successfully! You'll receive updates as it's prepared.`, {
        autoClose: 4000,
        position: 'top-center'
      });
      
      setSubmitted(true);
      setOrderQtyById({});
      setOrderNotes("");
      setTimeSlot("");
      setShowReview(false);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to submit order";
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
    <div className="min-h-screen bg-gray-50">
      {/* Compact Main Page */}
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white px-6 py-8 rounded-b-2xl shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Breakfast · Room {roomNumber}
          </h1>
          <p className="text-sm text-gray-600">
            {timeSlot || "Select a delivery time to get started"}
          </p>
        </div>

        {/* Main Actions */}
        <div className="px-6 py-8 space-y-4">
          {/* Primary CTA */}
          <button
            onClick={openMenuModal}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            Open Breakfast Menu
          </button>

          {/* Secondary Action */}
          <button
            onClick={() => {
              if (!showOrders) fetchOrders();
              setShowOrders(!showOrders);
            }}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium shadow-md hover:bg-green-700 transition-all duration-200"
          >
            {showOrders ? "Hide" : "View"} Your Breakfast Orders
          </button>

          {loadingOrders && (
            <p className="text-center text-gray-600 text-sm">Loading orders...</p>
          )}
        </div>

        {/* Show Orders */}
        {showOrders && !loadingOrders && (
          <div className="px-6 pb-8">
            <ViewOrders orders={orders} />
          </div>
        )}

        {/* Compact Stay Info */}
        <div className="mx-6 mb-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Stay Info</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium">Room:</span> {roomNumber}</p>
            <p><span className="font-medium">Hotel:</span> {hotelIdentifier}</p>
          </div>
        </div>

        {/* Need Assistance Footer */}
        <div className="px-6 pb-8">
          <button
            onClick={() => setShowPolicy(true)}
            className="w-full text-gray-600 py-2 text-sm hover:text-gray-800 transition-colors"
          >
            Need assistance? View pricing policy
          </button>
        </div>
      </div>

      {/* Breakfast Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center">
          <div className="bg-white/90 backdrop-blur-sm w-full md:max-w-4xl md:mx-4 max-h-[90vh] overflow-hidden rounded-t-2xl md:rounded-2xl shadow-xl ring-1 ring-black/5 transition-all duration-300 transform translate-y-0">
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Breakfast Menu</h2>
                <button
                  onClick={() => setShowMenuModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Time Selector */}
            <div className="bg-white px-6 py-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Select Delivery Time</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setTimeSlot(slot)}
                    className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all duration-200 ${
                      timeSlot === slot
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/30'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {!timeSlot && (
                <p className="text-sm text-gray-500 mt-3">Please select a delivery time</p>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="md:flex md:h-full">
                {/* Category Cards - Left Side */}
                <div className="md:w-1/3 bg-gray-50 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                  <div className="grid gap-3">
                    {availableCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => selectCategory(category)}
                        className={`p-4 rounded-xl text-left transition-all duration-200 ${
                          activeCategory === category
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm border border-gray-200'
                        }`}
                      >
                        <div className="font-medium">{category}</div>
                        <div className="text-sm opacity-75">
                          {groupedItems[category]?.length || 0} items
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List - Right Side */}
                <div className="md:w-2/3 p-6">
                  {activeCategory && groupedItems[activeCategory] ? (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">{activeCategory}</h3>
                        <span className="text-sm text-gray-500">
                          {groupedItems[activeCategory].length} items
                        </span>
                      </div>
                      
                      <div className="grid gap-4">
                        {groupedItems[activeCategory].map((item) => {
                          const isOutOfStock = item.is_on_stock === false;
                          const currentQty = orderQtyById[item.id] || 0;

                          return (
                            <div 
                              key={item.id}
                              className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${
                                isOutOfStock ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 mb-1">{item.name}</h4>
                                  <p className="text-sm text-gray-600 mb-3 overflow-hidden h-10 leading-5">
                                    {item.description}
                                  </p>
                                  
                                  {isOutOfStock ? (
                                    <div className="text-red-600 text-sm font-medium">
                                      Unavailable
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => decrementQty(item.id)}
                                        disabled={currentQty === 0}
                                        className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        −
                                      </button>
                                      <span className="w-8 text-center font-semibold text-gray-900">
                                        {currentQty}
                                      </span>
                                      <button
                                        onClick={() => incrementQty(item.id)}
                                        className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold hover:bg-blue-700 transition-colors"
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>Select a category to view items</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            {totalCount > 0 && (
              <div className="bg-white px-6 py-4 border-t border-gray-200 sticky bottom-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">
                    {totalCount} items selected
                  </span>
                </div>
                <button
                  onClick={() => setShowReview(true)}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Review Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Order Sheet */}
      {showReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-end md:items-center md:justify-center">
          <div className="bg-white/90 backdrop-blur-sm w-full md:max-w-2xl md:mx-4 max-h-[90vh] overflow-hidden rounded-t-2xl md:rounded-2xl shadow-xl ring-1 ring-black/5">
            <div className="overflow-y-auto max-h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Review Your Order</h3>
                  <button
                    onClick={() => setShowReview(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Selected Time */}
                {timeSlot && (
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="font-semibold text-blue-900">Delivery Time</div>
                      <div className="text-blue-700">{timeSlot}</div>
                    </div>
                  </div>
                )}

                {/* Selected Items */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Selected Items ({totalCount})
                  </h4>
                  <div className="space-y-3">
                    {selectedItemsList.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600 truncate">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <button
                            onClick={() => decrementQty(item.id)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-semibold text-gray-900">
                            {orderQtyById[item.id]}
                          </span>
                          <button
                            onClick={() => incrementQty(item.id)}
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold hover:bg-blue-700 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Global Notes */}
                <div className="mb-6">
                  <label className="block font-semibold text-gray-900 mb-3">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Any special requests or dietary requirements..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Pricing Link */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowPolicy(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                  >
                    Breakfast pricing information
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={loading || totalCount === 0 || !timeSlot}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Submitting..." : "Submit Breakfast Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-70 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto shadow-xl ring-1 ring-black/5">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Breakfast Pricing</h3>
            <p className="text-sm text-gray-700 mb-6 leading-relaxed">
              If you do not have included breakfast you will be charged <strong>17.50 Euro</strong> for Adult and <strong>12.50 Euro</strong> for a child. By sending this order you agree with the stated above.
            </p>
            <button
              onClick={() => setShowPolicy(false)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {submitted && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl z-40 shadow-lg">
          <p className="font-medium text-center">Order submitted successfully!</p>
        </div>
      )}
    </div>
  );
};

export default Breakfast;
