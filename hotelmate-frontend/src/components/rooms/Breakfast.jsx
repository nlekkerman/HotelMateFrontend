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
  const [showReview, setShowReview] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [activeTab, setActiveTab] = useState("");
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
              'pending': '📋 Your breakfast order is being reviewed',
              'accepted': '✅ Great! Your breakfast order is being prepared',
              'completed': '🏁 Your breakfast is ready for delivery!'
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

  // Tab scrolling
  const scrollToCategory = (category) => {
    const element = categoryRefs.current[category];
    if (element) {
      const headerOffset = 160; // Account for sticky headers
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Intersection observer for active tab
  useEffect(() => {
    const observers = [];
    
    availableCategories.forEach(category => {
      const element = categoryRefs.current[category];
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setActiveTab(category);
            }
          },
          { 
            rootMargin: '-160px 0px -60% 0px',
            threshold: 0.1
          }
        );
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, [availableCategories]);

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Breakfast · Room {roomNumber}
            </h1>
            <p className="text-sm text-gray-600">
              {timeSlot || "Select delivery time"}
            </p>
          </div>
          <button
            onClick={() => setShowPolicy(true)}
            className="text-gray-500 hover:text-gray-700 text-xl"
            title="Pricing Information"
          >
            ℹ️
          </button>
        </div>
      </div>

      {/* Sticky Category Tabs */}
      <div className="sticky top-16 bg-white border-b border-gray-200 z-30">
        <div className="max-w-3xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide px-4">
            {availableCategories.map((category) => (
              <button
                key={category}
                onClick={() => scrollToCategory(category)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === category
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* View Orders Section */}
        <div className="mb-8">
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (!showOrders) fetchOrders();
                setShowOrders(!showOrders);
              }}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-300"
            >
              {showOrders ? "Hide Your Breakfast Orders" : "View Your Breakfast Orders"}
            </button>
          </div>
          {loadingOrders && <p className="text-center mt-4">Loading orders...</p>}
          {showOrders && !loadingOrders && <ViewOrders orders={orders} />}
        </div>

        {/* Category Sections */}
        {availableCategories.map((category) => {
          const categoryItems = groupedItems[category];
          
          return (
            <div 
              key={category} 
              ref={el => categoryRefs.current[category] = el}
              id={`cat-${category.toLowerCase().replace(/\s+/g, '-')}`}
              className="mb-8"
            >
              <h3 className="text-xl font-bold mb-4 pb-2 border-b-2 border-gray-300">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryItems.map((item) => {
                  const isOutOfStock = item.is_on_stock === false;
                  const currentQty = orderQtyById[item.id] || 0;

                  return (
                    <div 
                      key={item.id} 
                      className={`border rounded-xl p-4 shadow-sm bg-white ${isOutOfStock ? 'opacity-50' : ''}`}
                    >
                      {item.image && (
                        <div className="relative">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-40 object-cover rounded-md mb-2"
                          />
                          {isOutOfStock && (
                            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                              OUT OF STOCK
                            </div>
                          )}
                        </div>
                      )}
                      <h4 className="text-lg font-semibold mb-2">{item.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                      {isOutOfStock ? (
                        <div className="text-red-600 font-semibold text-sm">
                          Currently unavailable
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Quantity:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decrementQty(item.id)}
                              disabled={currentQty === 0}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-medium">{currentQty}</span>
                            <button
                              onClick={() => incrementQty(item.id)}
                              className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold hover:bg-blue-700"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="mt-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={item.is_on_stock}
                              onChange={() => alert("Admin stock toggle logic needed")}
                            />
                            <span className="text-sm">In Stock</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Order Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {totalCount > 0 ? `${totalCount} item${totalCount !== 1 ? 's' : ''}` : 'No items selected'}
          </div>
          <button
            onClick={() => setShowReview(true)}
            disabled={totalCount === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Review Order
          </button>
        </div>
      </div>

      {/* Policy Modal */}
      {showPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-bold mb-4">Breakfast Pricing</h3>
            <p className="text-sm text-gray-700 mb-4">
              If you do not have included breakfast you will be charged <strong>17.50 Euro</strong> for Adult and <strong>12.50 Euro</strong> for a child. By sending this order you agree with the stated above.
            </p>
            <button
              onClick={() => setShowPolicy(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Review Order Sheet */}
      {showReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] overflow-y-auto rounded-t-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Review Your Order</h3>
                <button
                  onClick={() => setShowReview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Selected Items */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Selected Items ({totalCount})</h4>
                <div className="space-y-3">
                  {selectedItemsList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decrementQty(item.id)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-medium">{orderQtyById[item.id]}</span>
                        <button
                          onClick={() => incrementQty(item.id)}
                          className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold hover:bg-blue-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Slot */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">-- Select a Time Slot --</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {/* Global Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g., No mushrooms please, extra butter..."
                  className="w-full border border-gray-300 rounded px-3 py-2 h-20 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || totalCount === 0}
                className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Submitting..." : "Submit Breakfast Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {submitted && (
        <div className="fixed bottom-24 left-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-40">
          <p className="font-medium text-center">Order submitted successfully!</p>
        </div>
      )}
    </div>
  );
};

export default Breakfast;
