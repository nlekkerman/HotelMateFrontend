import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { setHotelIdentifier } from "@/services/apiWithHotel";
import { toast } from "react-toastify";
import DeletionModal from "@/components/modals/DeletionModal";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useRoomServiceState, useRoomServiceDispatch } from "@/realtime/stores/roomServiceStore.jsx";


export default function RoomService({ isAdmin }) {
  const { roomNumber, hotelIdentifier } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [orderItems, setOrderItems] = useState({});
  const [currentOrder, setCurrentOrder] = useState(null);
  const currentOrderId = currentOrder?.id ?? null;

  // Use roomServiceStore for realtime updates
  const roomServiceState = useRoomServiceState();
  const roomServiceDispatch = useRoomServiceDispatch();

  // Enhanced real-time tracking of current active order
  useEffect(() => {
    if (!roomServiceState || !currentOrder) return;

    const orderId = currentOrder.id;
    const storeOrder = roomServiceState.ordersById[orderId];
    
    if (storeOrder) {
      // Always sync the current order with store data
      setCurrentOrder(storeOrder);
      
      // Check if this is a recent status change (within last 10 seconds)
      if (storeOrder.updated_at) {
        const updatedTime = new Date(storeOrder.updated_at);
        const now = new Date();
        const timeDiff = now - updatedTime;
        
        if (timeDiff < 10000 && timeDiff > 0 && storeOrder.status !== currentOrder.status) {
          const statusMessages = {
            'pending': '📋 Your order is being reviewed by our kitchen staff',
            'accepted': '✅ Great! Your order is being prepared',
            'completed': '🏁 Your order is ready and on its way to your room!',
            'cancelled': '❌ Your order has been cancelled.'
          };
          
          const message = statusMessages[storeOrder.status] || `Order status: ${storeOrder.status}`;
          
          // Use different toast types based on status
          const toastType = storeOrder.status === 'completed' ? 'success' : 
                          storeOrder.status === 'cancelled' ? 'error' : 'info';
          
          toast[toastType](message, {
            autoClose: storeOrder.status === 'completed' ? 6000 : 5000,
            position: 'top-center'
          });

          // Play notification sound for completed orders
          if (storeOrder.status === 'completed') {
            try {
              const audio = new Audio("/notification.mp3");
              audio.volume = 0.6;
              audio.play().catch(() => {});
            } catch (err) {}
          }
        }
      }
    }
  }, [roomServiceState, currentOrder?.id]);

  // Real-time sync of all orders for this room using new Pusher logic
  useEffect(() => {
    if (!roomServiceState) return;
    
    const storeOrders = Object.values(roomServiceState.ordersById);
    const roomOrders = storeOrders.filter(order => {
      // Match room number (convert both to numbers for comparison)
      const orderRoomNum = parseInt(order.room_number);
      const currentRoomNum = parseInt(roomNumber);
      
      // Match hotel identifier
      const orderHotel = order.hotel_identifier || order.hotel_slug;
      
      return orderRoomNum === currentRoomNum && orderHotel === hotelIdentifier;
    }).sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
    
    // Always update previousOrders with latest data from store
    setPreviousOrders(roomOrders);
    
    // Check for recent status updates to show notifications
    roomOrders.forEach(order => {
      if (order.status && order.updated_at) {
        const updatedTime = new Date(order.updated_at);
        const now = new Date();
        const timeDiff = now - updatedTime;
        
        // Show notification if order was updated within the last 15 seconds
        if (timeDiff < 15000 && timeDiff > 0) {
          const statusMessages = {
            'pending': '📋 Your order is being reviewed by our kitchen staff',
            'accepted': '✅ Great! Your order is being prepared',
            'completed': '🏁 Your order is ready and on its way to your room!'
          };
          
          const message = statusMessages[order.status];
          if (message) {
            const toastType = order.status === 'completed' ? 'success' : 'info';
            
            toast[toastType](message, {
              autoClose: order.status === 'completed' ? 6000 : 5000,
              position: 'top-center'
            });

            // Play sound for completed orders
            if (order.status === 'completed') {
              try {
                const audio = new Audio("/notification.mp3");
                audio.volume = 0.6;
                audio.play().catch(() => {});
              } catch (err) {}
            }
          }
        }
      }
    });
  }, [roomServiceState, roomNumber, hotelIdentifier]);

  const [previousOrders, setPreviousOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);

const { refreshAll: refreshCount } = useOrderCount(hotelIdentifier);

  const [delModal, setDelModal] = useState({ show: false, itemId: null });

  const openDeleteModal = (itemId) => setDelModal({ show: true, itemId });
  const closeDeleteModal = () => setDelModal({ show: false, itemId: null });

  const trayCharge = 5;

  useEffect(() => {
    if (!roomNumber || !hotelIdentifier) return;
    setHotelIdentifier(hotelIdentifier);
    // Fetch menu
    api
      .get(`/room_services/${hotelIdentifier}/room/${roomNumber}/menu/`)
      .then((res) => {
        setItems(res.data);
        setLoading(false);
        const initQty = {};
        res.data.forEach((item) => {
          initQty[item.id] = 1;
        });
        setQuantities(initQty);
      })
      .catch(() => setLoading(false));

    // Fetch previous orders (hotel-scoped)
    api
      .get(`/room_services/orders/room-history`, {
        params: { hotel_slug: hotelIdentifier, room_number: roomNumber },
      })

      .then((res) => {
        let data = res.data;

        if (data && Array.isArray(data.results)) {
          data = data.results;
        }

        if (!Array.isArray(data)) {
          data = [];
        }

        const filtered = data.filter(
          (ord) => String(ord.room_number) === String(roomNumber)
        );

        setPreviousOrders(filtered);

        // Latest active (non-completed)
        const latestForRoom = filtered.find(
          (ord) => ord.status !== "completed" && ord.status !== "cancelled"
        );
        
        setCurrentOrder(latestForRoom || null);
      })
      .catch((err) => {
        setPreviousOrders([]);
      });
  }, [roomNumber, hotelIdentifier]);

  const handleQuantityChange = (id, val) => {
    const qty = Math.max(1, Math.min(99, Number(val)));
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const handleAddToOrder = (item) => {
    if (currentOrder) {
      setCurrentOrder(null);
      setOrderItems({});
    }
    const qtyToAdd = quantities[item.id] || 1;
    setOrderItems((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + qtyToAdd,
    }));
    toast.success(`Added ${item.name} × ${qtyToAdd}`, { autoClose: 1500 });
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      room_number: Number(roomNumber),
      items: Object.entries(orderItems).map(([itemId, qty]) => ({
        item_id: Number(itemId),
        quantity: qty,
      })),
    };

    try {
      setHotelIdentifier(hotelIdentifier);

      // POST to hotel-scoped orders endpoint
      const orderResp = await api.post(
        `/room_services/${hotelIdentifier}/orders/`,
        payload
      );

      // 1) Update local state and integrate with real-time store
      const newOrder = {
        ...orderResp.data,
        hotel_identifier: hotelIdentifier,
        room_number: Number(roomNumber)
      };
      
      setCurrentOrder(newOrder);
      setOrderItems({});
      setShowOrderPanel(false);
      
      // 2) Add to real-time store for proper Pusher integration
      roomServiceDispatch({
        type: 'ORDER_CREATED',
        payload: { order: newOrder }
      });
      
      toast.success("Order submitted successfully! You'll receive updates as it's prepared.", {
        autoClose: 4000
      });

      // 3) Refresh the navbar badge count
      refreshCount();
    } catch (err) {
      setSubmitError(err.response?.data || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center mt-4">Loading…</div>;

  const subTotal = Object.entries(orderItems).reduce((sum, [id, qty]) => {
    const itm = items.find((i) => i.id === +id);
    return sum + (Number(itm?.price) || 0) * qty;
  }, 0);
  const total = subTotal + trayCharge;

  //  Deletion Modal state & handlers ────────────────────────────────

  const confirmDelete = () => {
    const { itemId } = delModal;
    const item = items.find((i) => i.id === itemId);
    setOrderItems((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
    toast.warn(`Removed ${item.name}`, { autoClose: 1500 });
    closeDeleteModal();
  };

  // ─── NEW: Edit quantity for active items ────────────────────────────────
  const handleActiveQtyChange = (itemId, raw) => {
    const qty = Math.max(1, Math.min(99, Number(raw)));
    setOrderItems((prev) => ({ ...prev, [itemId]: qty }));
    const item = items.find((i) => i.id === itemId);
    toast.info(`Updated ${item.name} to ${qty}`, { autoClose: 1500 });
  };


  return (
    <div className="container my-4">
      <h2>Room Service — Room {roomNumber}</h2>
      
      {/* Active Orders Section */}
      {(() => {
        const activeOrders = previousOrders.filter(
          ord => ord.status !== 'completed' && ord.status !== 'cancelled'
        );
        
        return activeOrders.length > 0 && (
          <div className="mb-4">
            <h4 className="mb-3">
              <i className="bi bi-clock-history me-2"></i>
              Active Orders ({activeOrders.length})
            </h4>
            <div className="row">
              {activeOrders.map((ord) => {
                // Status messages - Updated for new workflow (pending → accepted → completed)
                const statusMessage = {
                  'pending': '📋 Your order is being reviewed by our kitchen staff',
                  'accepted': '✅ Great! Your order is being prepared',
                  'completed': '🏁 Your order is ready and on its way to your room!'
                };
                
                // Calculate progress percentage
                const getProgressPercentage = (status) => {
                  switch (status) {
                    case 'pending': return 33;
                    case 'accepted': return 66;
                    case 'completed': return 100;
                    default: return 0;
                  }
                };
                
                return (
                  <div key={ord.id} className="col-md-6 mb-3">
                    <div className="card border-primary shadow-sm">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="mb-0">Order #{ord.id}</h5>
                          <span
                            className={`badge px-3 py-2 fs-6 ${
                              ord.status === "pending"
                                ? "bg-warning text-dark"
                                : ord.status === "accepted"
                                ? "bg-info text-white"
                                : ord.status === "completed"
                                ? "bg-success text-white"
                                : "bg-secondary"
                            }`}
                          >
                            {ord.status.toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-muted">Order Progress</small>
                            <small className="text-muted">{getProgressPercentage(ord.status)}%</small>
                          </div>
                          <div className="progress" style={{ height: '6px' }}>
                            <div 
                              className="progress-bar bg-gradient"
                              role="progressbar" 
                              style={{ 
                                width: `${getProgressPercentage(ord.status)}%`,
                                background: ord.status === 'completed' 
                                  ? 'linear-gradient(90deg, #51cf66 0%, #51cf66 100%)'
                                  : ord.status === 'accepted'
                                  ? 'linear-gradient(90deg, #ffd43b 0%, #74c0fc 100%)'
                                  : 'linear-gradient(90deg, #ffd43b 0%, #ffd43b 100%)',
                                transition: 'width 0.3s ease'
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Status message */}
                        <div className="alert alert-light mb-3 py-2 px-3 small">
                          {statusMessage[ord.status] || 'Your order is being processed.'}
                        </div>
                        
                        <ul className="list-group list-group-flush">
                          {ord.items.map((oi) => (
                            <li
                              key={oi.id}
                              className="list-group-item d-flex justify-content-between px-0"
                            >
                              <span>
                                {oi.item.name} × {oi.quantity}
                              </span>
                              <span className="text-muted">
                                €{(Number(oi.item.price) * oi.quantity).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="d-flex justify-content-between mt-3 pt-2 border-top">
                          <strong>Total</strong>
                          <strong className="text-primary">€{Number(ord.total_price).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Menu grid */}
      <h4 className="mb-3 mt-4">Menu</h4>
      <div className="row">
        {items.map((item) => {
          const price = Number(item.price) || 0;
          return (
            <div key={item.id} className="col-md-4 mb-4">
              <div className="card h-100">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="card-img-top"
                    style={{ objectFit: "cover", height: "180px" }}
                  />
                )}
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">
                    {item.name} — €{price.toFixed(2)}
                  </h5>
                  <p className="card-text flex-grow-1">{item.description}</p>
                  <div className="mb-2 d-flex align-items-center">
                    <label className="form-label me-2 mb-0">Qty:</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={quantities[item.id]}
                      onChange={(e) =>
                        handleQuantityChange(item.id, e.target.value)
                      }
                      className="form-control d-inline-block"
                      style={{ width: "70px" }}
                      disabled={!item.is_on_stock}
                    />
                  </div>
                  <button
                    className="btn btn-primary mt-auto"
                    onClick={() => handleAddToOrder(item)}
                    disabled={!item.is_on_stock}
                  >
                    Add to Order
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      <button
        className={`btn position-fixed bottom-0 end-0 m-5 rounded-circle p-3 ${
          showOrderPanel ? "bg-warning text-dark" : "bg-danger text-white"
        }`}
        onClick={() => setShowOrderPanel((p) => !p)}
      >
        <i className={`bi bi-cart${showOrderPanel ? "-fill" : ""} fs-4`} />
      </button>

      {/* Order Panel */}
      {showOrderPanel && (
        <div
          className="position-fixed bottom-0 bg-black border-top p-3"
          style={{ maxHeight: "70%", overflowY: "auto", zIndex: 1000 }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0 text-white">Active Order</h3>
            <button
              className="btn-close bg-white"
              onClick={() => setShowOrderPanel(false)}
            />
          </div>

          {Object.keys(orderItems).length > 0 ? (
            <ul className="list-group mb-3 bg-transparent">
              {Object.entries(orderItems).map(([id, qty]) => {
                const item = items.find((i) => i.id === +id);
                const price = Number(item?.price) || 0;
                return (
                  <li
                    key={id}
                    className="list-group-item d-flex justify-content-between align-items-center bg-transparent text-white"
                  >
                    <div className="d-flex align-items-center">
                      <span>{item?.name}</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={qty}
                        onChange={(e) =>
                          handleActiveQtyChange(item.id, e.target.value)
                        }
                        className="form-control form-control-sm mx-2"
                        style={{ width: "60px" }}
                      />
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => openDeleteModal(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <span>€{(price * qty).toFixed(2)}</span>
                  </li>
                );
              })}
              <li className="list-group-item d-flex justify-content-between bg-transparent text-white">
                <em>Tray charge</em>
                <span>€{trayCharge.toFixed(2)}</span>
              </li>
              <li className="list-group-item d-flex justify-content-between fw-bold bg-warning text-black">
                <span>Total</span>
                <span>€{total.toFixed(2)}</span>
              </li>
            </ul>
          ) : (
            <p className="text-white bg-dark p-2">No active items.</p>
          )}

          {submitError && (
            <div className="alert alert-danger">{String(submitError)}</div>
          )}

          <button
            className="btn btn-success w-100 mb-4"
            onClick={handlePlaceOrder}
            disabled={submitting || !Object.keys(orderItems).length}
          >
            {submitting ? "Placing Order…" : "Place Order"}
          </button>

          {/* All Orders */}
          <div className="all-orders bg-black bg-opacity-75 text-white">
            <h5 className="mb-3">Your Orders ({previousOrders.length})</h5>
            {previousOrders.length === 0 ? (
              <p className="text-muted">No orders yet.</p>
            ) : (
              <>
                {previousOrders.map((ord) => (
                  <div key={ord.id} className="card mb-3 bg-dark border-light">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-white">
                          <strong>Order #{ord.id}</strong>
                        </span>
                        <span
                          className={`badge px-3 py-2 ${
                            ord.status === "pending"
                              ? "bg-warning text-dark"
                              : ord.status === "accepted"
                              ? "bg-info text-dark"
                              : ord.status === "preparing"
                              ? "bg-primary"
                              : ord.status === "ready"
                              ? "bg-success"
                              : ord.status === "delivered"
                              ? "bg-success"
                              : ord.status === "completed"
                              ? "bg-secondary"
                              : ord.status === "cancelled"
                              ? "bg-danger"
                              : "bg-secondary"
                          }`}
                        >
                          {ord.status.toUpperCase()}
                        </span>
                      </div>
                      <ul className="list-group mt-2">
                        {ord.items.map((oi) => (
                          <li
                            key={oi.id}
                            className="list-group-item d-flex justify-content-between bg-transparent text-white border-secondary"
                          >
                            <span>
                              {oi.item.name} × {oi.quantity}
                            </span>
                            <span>
                              €{(Number(oi.item.price) * oi.quantity).toFixed(2)}
                            </span>
                          </li>
                        ))}
                        <li className="list-group-item d-flex justify-content-between bg-transparent text-white border-secondary fw-bold">
                          <span>Total</span>
                          <span>€{Number(ord.total_price).toFixed(2)}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Deletion confirmation modal */}
      <DeletionModal
        show={delModal.show}
        title="Remove Item"
        confirmText="Delete"
        cancelText="Cancel"
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      >
        <p>
          Are you sure you want to remove{" "}
          <strong>{items.find((i) => i.id === delModal.itemId)?.name}</strong>{" "}
          from your order?
        </p>
      </DeletionModal>
    </div>
  );
}
