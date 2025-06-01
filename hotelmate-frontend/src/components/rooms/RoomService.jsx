import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { setHotelIdentifier } from "@/services/apiWithHotel"; 

export default function RoomService({ isAdmin }) {
  const { roomNumber, hotelIdentifier,  } = useParams(); // get roomNumber from URL
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Track quantities user wants to order per item (default 1)
  const [quantities, setQuantities] = useState({});

   useEffect(() => {
    if (!roomNumber || !hotelIdentifier) return;

    // Set the hotelIdentifier in the API before any request
    setHotelIdentifier(hotelIdentifier);

    api
      .get(`/room_services/room/${roomNumber}/menu/`)
      .then((res) => {
        setItems(res.data);
        setLoading(false);

        // initialize quantities
        const initialQuantities = {};
        res.data.forEach(item => {
          initialQuantities[item.id] = 1;
        });
        setQuantities(initialQuantities);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [roomNumber, hotelIdentifier]);

  const toggleStock = (itemId, currentStock) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, is_on_stock: !currentStock } : item
      )
    );

    api
      .patch(`/room_services/items/${itemId}/`, {
        is_on_stock: !currentStock,
      })
      .catch((err) => {
        console.error("Failed to update stock", err);
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, is_on_stock: currentStock } : item
          )
        );
      });
  };

  // Handle quantity change for item
  const handleQuantityChange = (itemId, value) => {
    const qty = Math.max(1, Math.min(99, Number(value))); // limit qty between 1 and 99
    setQuantities((prev) => ({
      ...prev,
      [itemId]: qty,
    }));
  };

  // Handle Add to Order click
  const handleAddToOrder = (item) => {
    const qty = quantities[item.id] || 1;
    // For now just console log, replace with your add-to-order logic
    console.log(`Adding to order: Item ${item.name} (ID: ${item.id}) Quantity: ${qty} for Room ${roomNumber}`);

    // TODO: implement API call to add items to order for roomNumber
  };

  if (loading) return <div className="text-center mt-4">Loading...</div>;

  return (
    <div className="container mt-3">
      <h2 className="mb-3">Room Service Menu for Room {roomNumber}</h2>
      <div className="row">
        {items.length === 0 && <p>No items available.</p>}
        {items.map((item) => (
          <div key={item.id} className="col-12 col-sm-6 col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="card-img-top"
                  style={{ objectFit: "cover", height: "180px" }}
                />
              )}
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{item.name}</h5>
                <p className="card-text flex-grow-1">{item.description}</p>
                <p><strong>Category:</strong> {item.category}</p>
                <p>
                  <strong>Price:</strong> {item.price != null && !isNaN(Number(item.price))
  ? Number(item.price).toFixed(2)
  : "N/A"}
</p>
                <p><strong>Quantity Available:</strong> {item.quantity || "-"}</p>

                <div className="d-flex justify-content-center align-items-center mt-auto">
                  {/* Quantity Selector */}
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={quantities[item.id] || 1}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    className="form-control"
                    style={{ width: "70px", marginRight: "10px" }}
                    disabled={!item.is_on_stock}
                  />

                  {/* Add Button */}
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddToOrder(item)}
                    disabled={!item.is_on_stock}
                  >
                    Add
                  </button>
                </div>

                <div className="form-check mt-3">
                  {isAdmin ? (
                    <>
                      <input
                        type="checkbox"
                        id={`stock-${item.id}`}
                        className="form-check-input"
                        checked={item.is_on_stock}
                        onChange={() => toggleStock(item.id, item.is_on_stock)}
                      />
                      <label
                        htmlFor={`stock-${item.id}`}
                        className={`form-check-label ${item.is_on_stock ? "text-success" : "text-danger"}`}
                      >
                        {item.is_on_stock ? "In Stock" : "Out of Stock"}
                      </label>
                    </>
                  ) : (
                    <small className={item.is_on_stock ? "text-success" : "text-danger"}>
                      {item.is_on_stock ? "In Stock" : "Out of Stock"}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
