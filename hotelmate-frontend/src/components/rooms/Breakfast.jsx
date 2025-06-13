import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "@/services/api";
import ViewOrders from "@/components/rooms/ViewOrders";

const TIME_SLOTS = [
  "7:00-8:00",
  "8:00-8:30",
  "8:30-9:00",
  "9:00-9:30",
  "9:30-10:00",
  "10:00-10:30",
];

const Breakfast = ({ isAdmin = false }) => {
  const { roomNumber, hotelIdentifier } = useParams();
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [timeSlot, setTimeSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  // Fetch breakfast items
  useEffect(() => {
    console.log(`Fetching breakfast items for room ${roomNumber}...`);
    api
      .get(`room_services/${hotelIdentifier}/room/${roomNumber}/breakfast/`)
      .then((res) => {
        console.log("Breakfast items fetched:", res.data);
        const formatted = res.data.map((item) => ({ ...item, quantity: 1 }));
        setItems(formatted);
      })
      .catch((err) => {
        console.error("Failed to fetch breakfast items:", err);
      });
  }, [roomNumber]);

  // Handle item checkbox toggle
  const toggleItem = (itemId) => {
    setSelectedItems((prev) => {
      const newSelected = {
        ...prev,
        [itemId]: prev[itemId] ? undefined : 1,
      };
      console.log("Toggled item selection:", newSelected);
      return newSelected;
    });
  };

  // Handle quantity change
  const handleQuantityChange = (itemId, qty) => {
    setSelectedItems((prev) => {
      const newSelected = {
        ...prev,
        [itemId]: qty,
      };
      console.log(`Quantity changed for item ${itemId}:`, qty);
      return newSelected;
    });
  };

  // Submit order
  const handleSubmit = async () => {
    setLoading(true);

    const itemsPayload = Object.entries(selectedItems).map(
      ([id, quantity]) => ({
        item_id: parseInt(id),
        quantity,
      })
    );

    const payload = {
      room_number: parseInt(roomNumber),
      delivery_time: timeSlot || null,
      items: itemsPayload,
    };

    try {
      const response = await api.post(
        `room_services/${hotelIdentifier}/breakfast-orders/`,
        payload
      );
      console.log("Order submitted successfully:", response.data);
      alert("Breakfast order submitted successfully!");
      setSubmitted(true);
      setSelectedItems({});
      setTimeSlot("");
    } catch (error) {
      alert(error.response?.data || error.message || "Failed to submit order");
    } finally {
      setLoading(false);
    }
  };
  // Fetch existing orders for this room + hotel
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await api.get(
        `room_services/${hotelIdentifier}/breakfast-orders/`,
        { params: { room_number: roomNumber } }
      );
      setOrders(response.data.results);
      console.log("Fetched orders:", response.data);
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
        className="mt-6 bg-green-600 text-white px-6 py-2 rounded mb-4 hover:bg-green-700 disabled:bg-gray-300"
      >
        {showOrders ? "Hide Your Breakfast Orders" : "View Your Breakfast Orders"}
      </button>
</div>
      {loadingOrders && <p>Loading orders...</p>}

      {showOrders && !loadingOrders && <ViewOrders orders={orders} />}
    </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-xl p-4 shadow-sm">
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-40 object-cover rounded-md mb-2"
              />
            )}
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
            <p className="text-sm italic">{item.category}</p>

            <div className="mt-2">
              <label>
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={!!selectedItems[item.id]}
                  onChange={() => toggleItem(item.id)}
                />
                Add to order
              </label>

              {selectedItems[item.id] && (
                <input
                  type="number"
                  min="1"
                  value={selectedItems[item.id]}
                  onChange={(e) =>
                    handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                  }
                  className="ml-3 border rounded px-2 py-1 w-16"
                />
              )}
            </div>

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
        ))}
      </div>

      <div className="mt-6">
        <label className="block mb-2 font-semibold">
          Select Delivery Time:
        </label>
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
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || Object.keys(selectedItems).length === 0}
        className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? "Submitting..." : "Submit Breakfast Order"}
      </button>

      {submitted && (
        <div className="mt-4 text-green-600 font-semibold">
          Order submitted successfully!
        </div>
      )}
    </div>
  );
};

export default Breakfast;
