import React, { useEffect, useState } from "react";
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
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: { quantity: 1, notes: "" } }
  const [timeSlot, setTimeSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  
  // Use room service store for real-time updates
  const roomServiceState = useRoomServiceState();
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

  // Handle item checkbox toggle
  const toggleItem = (itemId) => {
    setSelectedItems((prev) => {
      const newSelected = { ...prev };
      if (newSelected[itemId]) {
        delete newSelected[itemId];
      } else {
        newSelected[itemId] = { quantity: 1, notes: "" };
      }
      return newSelected;
    });
  };

  // Handle quantity change
  const handleQuantityChange = (itemId, qty) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: qty },
    }));
  };

  // Handle notes change
  const handleNotesChange = (itemId, notes) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], notes },
    }));
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // Define category order for display
  const categoryOrder = ["Mains", "Hot Buffet", "Cold Buffet", "Breads", "Condiments", "Drinks", "Other"];

  // Submit order
  const handleSubmit = async () => {
    setLoading(true);

    const itemsPayload = Object.entries(selectedItems).map(([id, data]) => ({
      item_id: parseInt(id),
      quantity: data.quantity,
      notes: data.notes || undefined, // Only include if not empty
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
      setSelectedItems({});
      setTimeSlot("");
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
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">
        Breakfast Menu for Room {roomNumber}
      </h2>
         <div>
      <div className="breakfast-price-for-non-included bg-warning rounded bg-opacity-50 p-2 mb-2">If you do not have included breakfast you will be charged <strong>17.50 Euro</strong> for Aduld and <strong>12.50 Euro</strong> for a child. By sending this order you are agree with stated above </div>
      
      {/* Button to toggle and load orders */}
      <div className="d-flex justify-content-center ">
      <button
        onClick={() => {
          if (!showOrders) fetchOrders();
          setShowOrders(!showOrders);
        }}
        className="mt-6 bg-green-600 custom-button px-6 py-2 rounded mb-4 hover:bg-green-700 disabled:bg-gray-300"
      >
        {showOrders ? "Hide Your Breakfast Orders" : "View Your Breakfast Orders"}
      </button>
</div>
      {loadingOrders && <p>Loading orders...</p>}

      {showOrders && !loadingOrders && <ViewOrders orders={orders} />}
    </div>

      {/* Display items grouped by category */}
      {categoryOrder.map((category) => {
        const categoryItems = groupedItems[category];
        if (!categoryItems || categoryItems.length === 0) return null;

        return (
          <div key={category} className="mb-6">
            <h3 className="text-xl font-bold mb-3 pb-2 border-b-2 border-gray-300">
              {category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categoryItems.map((item) => {
                const isOutOfStock = item.is_on_stock === false;
                const isSelected = !!selectedItems[item.id];

                return (
                  <div 
                    key={item.id} 
                    className={`border rounded-xl p-4 shadow-sm ${isOutOfStock ? 'opacity-50 bg-gray-100' : ''}`}
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
                    <h4 className="text-lg font-semibold">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>

                    {isOutOfStock ? (
                      <div className="mt-2 text-red-600 font-semibold text-sm">
                        <i className="bi bi-x-circle me-1"></i>
                        Currently unavailable
                      </div>
                    ) : (
                      <>
                        <div className="mt-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={isSelected}
                              onChange={() => toggleItem(item.id)}
                            />
                            <span className="font-medium">Add to order</span>
                          </label>

                          {isSelected && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Quantity:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={selectedItems[item.id].quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                                  }
                                  className="border rounded px-2 py-1 w-16"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium block mb-1">
                                  Special instructions (optional):
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., No mushrooms please"
                                  value={selectedItems[item.id].notes}
                                  onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                  className="border rounded px-2 py-1 w-full text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {isAdmin && (
                      <div className="mt-2">
                        <label>
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={item.is_on_stock}
                            onChange={() => alert("Admin stock toggle logic needed")}
                          />
                          In Stock
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

      <div className="mt-6 d-flex justify-content-evenly">
        
        <select
          value={timeSlot}
          onChange={(e) => setTimeSlot(e.target.value)}
          className="border rounded p-2 w-full max-w-xs"
        >
          <option value="">-- Select a Time Slot --</option>
          {TIME_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
          <button
        onClick={handleSubmit}
        disabled={loading || Object.keys(selectedItems).length === 0}
        className="mt-6 bg-blue-600 custom-button  px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? "Submitting..." : "Submit Breakfast Order"}
      </button>

      </div>

    
      {submitted && (
        <div className="mt-4 text-green-600 font-semibold">
          Order submitted successfully!
        </div>
      )}
    </div>
  );
};

export default Breakfast;
