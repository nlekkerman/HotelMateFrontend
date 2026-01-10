import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "@/services/api";
import ViewOrders from "@/components/rooms/ViewOrders";
import { useRoomServiceState } from "@/realtime/stores/roomServiceStore.jsx";

// Add CSS animation styles
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

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
  const [visibleCategories, setVisibleCategories] = useState(new Set());
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
        // Show first category by default
        if (formatted.length > 0) {
          const firstCategory = categoryOrder.find(cat => 
            formatted.some(item => (item.category || "Other") === cat)
          );
          if (firstCategory) {
            setVisibleCategories(new Set([firstCategory]));
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

  // Toggle category visibility
  const toggleCategory = (category) => {
    setVisibleCategories(prev => {
      const newVisible = new Set(prev);
      if (newVisible.has(category)) {
        newVisible.delete(category);
      } else {
        newVisible.add(category);
      }
      return newVisible;
    });
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
    <>
      <style>{animationStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-100 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200 z-40 px-4 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🍳 Breakfast · Room {roomNumber}
            </h1>
            <p className="text-sm text-orange-700 font-medium">
              {timeSlot || "Select delivery time"} • {visibleCategories.size} categories selected
            </p>
          </div>
          <button
            onClick={() => setShowPolicy(true)}
            className="bg-orange-100 hover:bg-orange-200 text-orange-700 p-2 rounded-full transition-colors"
            title="Pricing Information"
          >
            ℹ️
          </button>
        </div>
      </div>

      {/* Sticky Category Tabs */}
      <div className="sticky top-20 bg-white border-b border-gray-200 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide px-4 py-2">
            {availableCategories.map((category) => {
              const isVisible = visibleCategories.has(category);
              const categoryEmojis = {
                'Mains': '🍳',
                'Hot Buffet': '🔥',
                'Cold Buffet': '🥗',
                'Breads': '🍞',
                'Condiments': '🧈',
                'Drinks': '☕',
                'Other': '🍽️'
              };
              
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`flex-shrink-0 mx-1 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2 ${
                    isVisible
                      ? 'bg-orange-500 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700'
                  }`}
                >
                  <span>{categoryEmojis[category] || '🍽️'}</span>
                  {category}
                  {isVisible && <span className="text-xs">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500 text-center">
              Tap categories to show/hide • {totalCount} items in cart
            </p>
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
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:bg-gray-300 font-medium shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <span>📋</span>
              {showOrders ? "Hide Your Breakfast Orders" : "View Your Breakfast Orders"}
            </button>
          </div>
          {loadingOrders && <p className="text-center mt-4 text-gray-600">Loading orders...</p>}
          {showOrders && !loadingOrders && <ViewOrders orders={orders} />}
        </div>

        {/* No Categories Selected Message */}
        {visibleCategories.size === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">🍳</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Select categories to start ordering</h3>
            <p className="text-gray-500">Tap on the category buttons above to browse our breakfast menu</p>
          </div>
        )}

        {/* Category Sections */}
        {availableCategories.map((category) => {
          const categoryItems = groupedItems[category];
          const isVisible = visibleCategories.has(category);
          
          if (!isVisible) return null;
          
          const categoryEmojis = {
            'Mains': '🍳',
            'Hot Buffet': '🔥', 
            'Cold Buffet': '🥗',
            'Breads': '🍞',
            'Condiments': '🧈',
            'Drinks': '☕',
            'Other': '🍽️'
          };
          
          return (
            <div 
              key={category} 
              ref={el => categoryRefs.current[category] = el}
              id={`cat-${category.toLowerCase().replace(/\s+/g, '-')}`}
              className="mb-8 animate-fadeIn"
            >
              <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-4 rounded-t-xl">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <span className="text-3xl">{categoryEmojis[category] || '🍽️'}</span>
                  {category}
                  <span className="text-sm font-normal opacity-80">({categoryItems.length} items)</span>
                </h3>
              </div>
              <div className="bg-white rounded-b-xl p-6 shadow-lg border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {categoryItems.map((item) => {
                  const isOutOfStock = item.is_on_stock === false;
                  const currentQty = orderQtyById[item.id] || 0;

                  return (
                    <div 
                      key={item.id} 
                      className={`border-2 rounded-2xl p-5 shadow-md bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] ${
                        isOutOfStock ? 'opacity-50 grayscale' : ''
                      } ${
                        currentQty > 0 ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      {item.image && (
                        <div className="relative">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-40 object-cover rounded-xl mb-3 shadow-sm"
                          />
                          {isOutOfStock && (
                            <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                              ❌ OUT OF STOCK
                            </div>
                          )}
                          {currentQty > 0 && !isOutOfStock && (
                            <div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                              {currentQty} in cart
                            </div>
                          )}
                        </div>
                      )}
                      <h4 className="text-xl font-bold mb-2 text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{item.description}</p>

                      {isOutOfStock ? (
                        <div className="text-red-600 font-bold text-sm bg-red-50 p-3 rounded-lg text-center">
                          ❌ Currently unavailable
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">Quantity:</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => decrementQty(item.id)}
                              disabled={currentQty === 0}
                              className="w-10 h-10 rounded-full border-2 border-orange-300 bg-white flex items-center justify-center text-xl font-bold hover:bg-orange-50 hover:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-bold text-lg text-orange-600">{currentQty}</span>
                            <button
                              onClick={() => incrementQty(item.id)}
                              className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center text-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
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
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-yellow-500 border-t-4 border-orange-300 p-4 z-50 shadow-2xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-white">
            <div className="font-bold text-lg">
              {totalCount > 0 ? (
                <span className="flex items-center gap-2">
                  🛍️ {totalCount} item{totalCount !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="flex items-center gap-2">🛍️ No items selected</span>
              )}
            </div>
            <div className="text-xs opacity-90">
              {visibleCategories.size} categories showing
            </div>
          </div>
          <button
            onClick={() => setShowReview(true)}
            disabled={totalCount === 0}
            className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
              totalCount > 0
                ? 'bg-white text-orange-600 hover:bg-orange-50 hover:shadow-xl transform hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {totalCount > 0 ? '👀 Review Order' : 'Select Items'}
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
    </>
  );
};

export default Breakfast;
