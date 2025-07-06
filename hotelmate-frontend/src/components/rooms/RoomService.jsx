import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { setHotelIdentifier } from "@/services/apiWithHotel";
import { toast } from "react-toastify";
import DeletionModal from "@/components/modals/DeletionModal";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";

export default function RoomService({ isAdmin }) {
  const { roomNumber, hotelIdentifier } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [orderItems, setOrderItems] = useState({});
  const [currentOrder, setCurrentOrder] = useState(null);
  const [previousOrders, setPreviousOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);

  const { refresh: refreshCount } = useOrderCount(hotelIdentifier);

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
          console.warn("Unexpected previousOrders response:", data);
          data = [];
        }

        const filtered = data.filter(
          (ord) => String(ord.room_number) === String(roomNumber)
        );

        setPreviousOrders(filtered);

        // Latest active (non-completed)
        const latestForRoom = filtered.find(
          (ord) => ord.status !== "completed"
        );
        setCurrentOrder(latestForRoom || null);
      })
      .catch((err) => {
        console.error(err);
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

      // 1) Update local state
      setCurrentOrder(orderResp.data);
      setOrderItems({});
      setShowOrderPanel(false);
      toast.success("Order submitted successfully!");
      setPreviousOrders((prev) => [orderResp.data, ...prev]);

      // 2) Refresh the navbar badge count
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
      {currentOrder && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between shadow-sm border border-dark">
          <div>
            <h5 className="mb-1">Current Order Status</h5>
            <p className="mb-0">
              Order <strong>#{currentOrder.id}</strong> is currently{" "}
              <span
                className={`badge px-3 py-2 fs-6 ${
                  currentOrder.status === "pending"
                    ? "bg-warning text-dark"
                    : currentOrder.status === "accepted"
                    ? "bg-primary"
                    : "bg-success"
                }`}
              >
                {currentOrder.status.toUpperCase()}
              </span>
            </p>
          </div>
          <i className="bi bi-info-circle fs-4 text-dark ms-3" />
        </div>
      )}

      {/* Menu grid */}
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

          {/* Previous Orders */}
          <div className="previous-orders bg-black bg-opacity-75 text-white">
            <h5>Previous Orders</h5>
            {previousOrders.length === 0 ? (
              <p>No previous orders.</p>
            ) : (
              previousOrders.map((ord) => (
                <div key={ord.id} className="card mb-2 bg-transparent">
                  <div className="card-body bg-transparent text-white">
                    <div className="d-flex justify-content-between">
                      <span>
                        <strong>Order #{ord.id}</strong>
                      </span>
                      <span>{ord.status}</span>
                    </div>
                    <ul className="list-group mt-2">
                      {ord.items.map((oi) => (
                        <li
                          key={oi.id}
                          className="list-group-item d-flex justify-content-between bg-transparent text-white"
                        >
                          <span>
                            {oi.item.name} × {oi.quantity}
                          </span>
                          <span>
                            €{(Number(oi.item.price) * oi.quantity).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
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
