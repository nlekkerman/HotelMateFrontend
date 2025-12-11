import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import { toast } from "react-toastify";
import DeletionModal from "@/components/modals/DeletionModal";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useRoomServiceState, useRoomServiceDispatch } from "@/realtime/stores/roomServiceStore.jsx";
import { subscribeBaseHotelChannels } from "@/realtime/channelRegistry";
import "./RoomService.css";


export default function RoomService({ isAdmin }) {
  const { roomNumber, hotelIdentifier } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [orderItems, setOrderItems] = useState({});
  const [currentOrder, setCurrentOrder] = useState(null);
  const currentOrderId = currentOrder?.id ?? null;
  
  // Additional state variables
  const [previousOrders, setPreviousOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [delModal, setDelModal] = useState({ show: false, itemId: null });

  // Use roomServiceStore for realtime updates
  const roomServiceState = useRoomServiceState();
  const roomServiceDispatch = useRoomServiceDispatch();

  // 🔍 DEBUG: Log store state changes
  useEffect(() => {
    console.log('🏨 [RoomService] Store state updated:', {
      ordersCount: Object.keys(roomServiceState.ordersById || {}).length,
      orders: roomServiceState.ordersById,
      roomNumber,
      hotelIdentifier
    });
  }, [roomServiceState, roomNumber, hotelIdentifier]);

  // Enhanced real-time tracking of current active order
  useEffect(() => {
    console.log('🔄 [RoomService] Current order tracking effect triggered:', {
      hasRoomServiceState: !!roomServiceState,
      hasCurrentOrder: !!currentOrder,
      currentOrderId: currentOrder?.id,
      currentOrderStatus: currentOrder?.status
    });
    
    if (!roomServiceState || !currentOrder) return;

    const orderId = currentOrder.id;
    const storeOrder = roomServiceState.ordersById[orderId];
    
    console.log('🎯 [RoomService] Order comparison:', {
      orderId,
      storeOrderExists: !!storeOrder,
      storeOrderStatus: storeOrder?.status,
      currentOrderStatus: currentOrder?.status,
      storeOrderUpdatedAt: storeOrder?.updated_at,
      storeOrder: storeOrder
    });
    
    if (storeOrder) {
      // Always sync the current order with store data
      setCurrentOrder(storeOrder);
      
      // Check if this is a recent status change (within last 10 seconds)
      if (storeOrder.updated_at) {
        const updatedTime = new Date(storeOrder.updated_at);
        const now = new Date();
        const timeDiff = now - updatedTime;
        
        if (timeDiff < 10000 && timeDiff > 0 && storeOrder.status !== currentOrder.status) {
          console.log('🚨 [RoomService] Status change detected!', {
            orderId,
            oldStatus: currentOrder.status,
            newStatus: storeOrder.status,
            timeDiff,
            updatedAt: storeOrder.updated_at
          });
          
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
    console.log('🏠 [RoomService] Room orders sync effect triggered:', {
      hasRoomServiceState: !!roomServiceState,
      storeOrdersCount: roomServiceState ? Object.keys(roomServiceState.ordersById).length : 0,
      roomNumber,
      hotelIdentifier
    });
    
    if (!roomServiceState) return;
    
    const storeOrders = Object.values(roomServiceState.ordersById);
    console.log('📋 [RoomService] All store orders:', storeOrders);
    const roomOrders = storeOrders.filter(order => {
      // Match room number (convert both to numbers for comparison)
      const orderRoomNum = parseInt(order.room_number);
      const currentRoomNum = parseInt(roomNumber);
      
      // Match hotel identifier - be more flexible with hotel matching
      const orderHotel = order.hotel_identifier || order.hotel_slug || hotelIdentifier;
      
      // For orders from API, they might not have hotel identifier, so just match by room
      const roomMatch = orderRoomNum === currentRoomNum;
      const hotelMatch = !orderHotel || orderHotel === hotelIdentifier;
      const matches = roomMatch && hotelMatch;
      
      console.log('🔍 [RoomService] Order filter check:', {
        orderId: order.id,
        orderRoomNum,
        currentRoomNum,
        roomMatch,
        orderHotel,
        hotelIdentifier,
        hotelMatch,
        overallMatch: matches,
        orderStatus: order.status
      });
      
      return matches;
    }).sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp));
    
    console.log('🎯 [RoomService] Filtered room orders:', {
      totalStoreOrders: storeOrders.length,
      roomOrdersCount: roomOrders.length,
      roomOrders: roomOrders.map(o => ({ id: o.id, status: o.status, room_number: o.room_number }))
    });
    
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

  // 🔥 Subscribe to Pusher channels for real-time events
  useEffect(() => {
    if (!hotelIdentifier) return;

    console.log('🔥 [RoomService] Subscribing to real-time channels:', {
      hotelIdentifier,
      roomNumber,
      userType: 'guest'
    });
    
    // Subscribe to base hotel channels including room-service
    const cleanup = subscribeBaseHotelChannels({ 
      hotelSlug: hotelIdentifier
    });
    
    console.log('✅ [RoomService] Pusher subscription initialized for hotel:', hotelIdentifier);
    
    return () => {
      console.log('🧹 [RoomService] Cleaning up Pusher subscriptions');
      cleanup();
    };
  }, [hotelIdentifier, roomNumber]);

  // 🚨 DEBUG: Listen for FCM notifications and other events
  useEffect(() => {
    const handleFCMMessage = (event) => {
      console.log('📱 [RoomService] FCM notification received:', event.detail || event);
    };

    const handlePusherEvent = (event) => {
      console.log('📡 [RoomService] Pusher event received:', event.detail || event);
    };

    const handleCustomEvent = (event) => {
      if (event.type.includes('room') || event.type.includes('order') || event.type.includes('service')) {
        console.log('🔔 [RoomService] Custom event received:', event.type, event.detail || event);
      }
    };

    // 🔥 NEW: Listen for status updates from orders management page
    const handleStatusUpdate = (event) => {
      console.log('🚨 [RoomService] Status update event from orders management:', event.detail);
      
      const { orderId, oldStatus, newStatus, order, source } = event.detail;
      
      // Check if this affects our current room
      if (order.room_number == roomNumber) {
        console.log('✨ [RoomService] Status update is for our room!', {
          roomNumber,
          orderId,
          oldStatus,
          newStatus,
          source
        });
        
        // Update the store manually to ensure synchronization
        roomServiceDispatch({
          type: 'ORDER_UPDATED',
          payload: {
            order: order,
            orderId: orderId,
            event_type: 'order_updated',
            source: 'custom_event_listener'
          }
        });
        
        // Show toast notification
        const statusMessages = {
          'pending': '📋 Your order is being reviewed by our kitchen staff',
          'accepted': '✅ Great! Your order is being prepared',
          'completed': '🏁 Your order is ready and on its way to your room!',
          'cancelled': '❌ Your order has been cancelled.'
        };
        
        const message = statusMessages[newStatus];
        if (message) {
          const toastType = newStatus === 'completed' ? 'success' : 
                          newStatus === 'cancelled' ? 'error' : 'info';
          
          toast[toastType](message, {
            autoClose: newStatus === 'completed' ? 6000 : 5000,
            position: 'top-center'
          });
          
          // Play sound for completed orders
          if (newStatus === 'completed') {
            try {
              const audio = new Audio("/notification.mp3");
              audio.volume = 0.6;
              audio.play().catch(() => {});
            } catch (err) {}
          }
        }
      }
    };

    // Listen for various event types
    if (typeof window !== 'undefined') {
      window.addEventListener('fcm-message', handleFCMMessage);
      window.addEventListener('pusher-event', handlePusherEvent);
      window.addEventListener('room-service-update', handleCustomEvent);
      window.addEventListener('room-service-status-updated', handleStatusUpdate);
      
      // Debug: Log if we're listening
      console.log('👂 [RoomService] Event listeners registered for FCM, Pusher, and status update events');
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('fcm-message', handleFCMMessage);
        window.removeEventListener('pusher-event', handlePusherEvent);
        window.removeEventListener('room-service-update', handleCustomEvent);
        window.removeEventListener('room-service-status-updated', handleStatusUpdate);
      }
    };
  }, [roomNumber, roomServiceDispatch]);

  const { refreshAll: refreshCount } = useOrderCount(hotelIdentifier);

  const openDeleteModal = (itemId) => setDelModal({ show: true, itemId });
  const closeDeleteModal = () => setDelModal({ show: false, itemId: null });

  const trayCharge = 5;

  useEffect(() => {
    if (!roomNumber || !hotelIdentifier) return;
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

        // 🔄 Initialize the Pusher store with fetched orders
        console.log('🔄 [RoomService] Initializing store with API-fetched orders:', {
          totalOrders: filtered.length,
          orderIds: filtered.map(o => o.id),
          statuses: filtered.map(o => `${o.id}:${o.status}`)
        });
        
        // Convert API orders to store format and initialize
        const storeOrders = filtered.map(order => ({
          ...order,
          // Ensure consistent field names for store
          order_id: order.id,
          type: order.type || 'room_service',
          hotel_identifier: hotelIdentifier,
          hotel_slug: hotelIdentifier
        }));
        
        // Initialize store with API data using dispatch
        storeOrders.forEach(order => {
          roomServiceDispatch({
            type: 'ORDER_CREATED',
            payload: { order }
          });
        });
        console.log('✅ [RoomService] Store initialized with', storeOrders.length, 'orders via dispatch');

        // Latest active (non-completed)
        const latestForRoom = filtered.find(
          (ord) => ord.status !== "completed" && ord.status !== "cancelled"
        );
        
        setCurrentOrder(latestForRoom || null);
        console.log('🎯 [RoomService] Current active order set:', latestForRoom?.id || 'none');
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
    console.log('📤 [RoomService] Starting order submission:', {
      roomNumber,
      hotelIdentifier,
      orderItems,
      specialInstructions,
      itemCount: Object.keys(orderItems).length
    });
    
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      room_number: Number(roomNumber),
      special_instructions: specialInstructions.trim(),
      items: Object.entries(orderItems).map(([itemId, qty]) => ({
        item_id: Number(itemId),
        quantity: qty,
      })),
    };

    try {
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
      
      console.log('✅ [RoomService] Order created successfully:', {
        orderId: newOrder.id,
        orderData: newOrder,
        apiResponse: orderResp.data
      });
      
      setCurrentOrder(newOrder);
      setOrderItems({});
      setSpecialInstructions('');
      setShowOrderPanel(false);
      
      // 2) Add to real-time store for proper Pusher integration
      console.log('🔄 [RoomService] Dispatching ORDER_CREATED to store:', newOrder);
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
    <div className="container-fluid px-0 py-3" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="d-flex  align-items-center justify-content-between mb-4">
        <div>
          <h1 className="display-6 mb-1 text-primary">🍽️ Room Service</h1>
          <p className="text-muted mb-0 fs-5">Room {roomNumber} • Order freshly prepared meals</p>
        </div>
        <div className="text-end">
          <div className="badge bg-light text-dark fs-6 px-3 py-2">
            <i className="bi bi-clock me-1"></i>
            Available 24/7
          </div>
        </div>
      </div>
      
      {/* Active Orders Section */}
      {(() => {
        const activeOrders = previousOrders.filter(
          ord => ord.status !== 'completed' && ord.status !== 'cancelled'
        );
        
        return activeOrders.length > 0 && (
          <div className="mb-5">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-primary rounded-circle p-2 me-3">
                <i className="bi bi-clock-history text-white fs-5"></i>
              </div>
              <div>
                <h3 className="mb-0">Your Active Orders</h3>
                <p className="text-muted mb-0">{activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''} in progress</p>
              </div>
            </div>
            <div className="room-service-orders-container ">
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
                    <div key={ord.id} className="card h-100 shadow-sm border-0" style={{ 
                      borderLeft: ord.status === 'completed' ? '4px solid #51cf66' : 
                                 ord.status === 'accepted' ? '4px solid #74c0fc' : '4px solid #ffd43b'
                    }}>
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h4 className="mb-1 fw-bold text-dark">Order #{ord.id}</h4>
                            <p className="text-muted mb-0 small">
                              <i className="bi bi-calendar3 me-1"></i>
                              {new Date(ord.created_at || ord.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`badge rounded-pill px-3 py-2 fs-7 fw-semibold ${
                              ord.status === "pending"
                                ? "bg-warning-subtle text-warning-emphasis border border-warning"
                                : ord.status === "accepted"
                                ? "bg-info-subtle text-info-emphasis border border-info"
                                : ord.status === "completed"
                                ? "bg-success-subtle text-success-emphasis border border-success"
                                : "bg-secondary-subtle text-secondary-emphasis"
                            }`}
                          >
                            {ord.status === 'pending' ? '📋 REVIEWING' : 
                             ord.status === 'accepted' ? '👨‍🍳 PREPARING' : 
                             ord.status === 'completed' ? '✅ READY' : ord.status.toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Progress Steps */}
                        <div className="mb-4">
                          <div className="d-flex justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                              <div className={`rounded-circle me-2 ${ord.status === 'pending' || ord.status === 'accepted' || ord.status === 'completed' ? 'bg-primary text-white' : 'bg-light text-muted'}`} 
                                   style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                                <i className="bi bi-clipboard-check d-flex align-items-center justify-content-center" style={{ lineHeight: '24px' }}></i>
                              </div>
                              <small className="fw-semibold">Received</small>
                            </div>
                            <div className="d-flex align-items-center">
                              <div className={`rounded-circle me-2 ${ord.status === 'accepted' || ord.status === 'completed' ? 'bg-primary text-white' : 'bg-light text-muted'}`} 
                                   style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                                <i className="bi bi-tools d-flex align-items-center justify-content-center" style={{ lineHeight: '24px' }}></i>
                              </div>
                              <small className="fw-semibold">Preparing</small>
                            </div>
                            <div className="d-flex align-items-center">
                              <div className={`rounded-circle me-2 ${ord.status === 'completed' ? 'bg-success text-white' : 'bg-light text-muted'}`} 
                                   style={{ width: '24px', height: '24px', fontSize: '12px' }}>
                                <i className="bi bi-check-lg d-flex align-items-center justify-content-center" style={{ lineHeight: '24px' }}></i>
                              </div>
                              <small className="fw-semibold">Ready</small>
                            </div>
                          </div>
                          <div className="progress" style={{ height: '4px' }}>
                            <div 
                              className="progress-bar"
                              role="progressbar" 
                              style={{ 
                                width: `${getProgressPercentage(ord.status)}%`,
                                backgroundColor: ord.status === 'completed' ? '#51cf66' : ord.status === 'accepted' ? '#74c0fc' : '#ffd43b',
                                transition: 'width 0.6s ease'
                              }}
                            ></div>
                          </div>
                        </div>

                        {/* Status message */}
                        <div className={`alert mb-3 py-3 px-3 border-0 ${
                          ord.status === 'completed' ? 'alert-success bg-success-subtle' :
                          ord.status === 'accepted' ? 'alert-info bg-info-subtle' :
                          'alert-warning bg-warning-subtle'
                        }`}>
                          <div className="d-flex align-items-center">
                            <i className={`me-2 ${
                              ord.status === 'completed' ? 'bi bi-check-circle-fill text-success' :
                              ord.status === 'accepted' ? 'bi bi-clock-fill text-info' :
                              'bi bi-hourglass-split text-warning'
                            }`}></i>
                            <span className="fw-medium">{statusMessage[ord.status] || 'Your order is being processed.'}</span>
                          </div>
                        </div>

                        {/* Special instructions if any */}
                        {ord.special_instructions && (
                          <div className="mb-3 p-3 bg-light rounded-3">
                            <h6 className="mb-2 text-dark">
                              <i className="bi bi-chat-square-text me-2"></i>Special Instructions
                            </h6>
                            <p className="mb-0 text-muted small">{ord.special_instructions}</p>
                          </div>
                        )}
                        
                        <div className="bg-light rounded-3 p-3 mb-3">
                          <h6 className="mb-3 text-dark fw-semibold">
                            <i className="bi bi-bag-check me-2"></i>Order Items ({ord.items.length})
                          </h6>
                          <div className="row g-2">
                            {ord.items.map((oi) => (
                              <div key={oi.id} className="col-12">
                                <div className="d-flex justify-content-between align-items-center py-2 px-3 bg-white rounded-2 shadow-sm">
                                  <div className="d-flex align-items-center">
                                    <div className="badge bg-primary rounded-circle me-3" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                                      {oi.quantity}
                                    </div>
                                    <div>
                                      <div className="fw-medium text-dark">{oi.item?.name || oi.name || 'Unknown Item'}</div>
                                      <small className="text-muted">€{Number(oi.item?.price || oi.price || 0).toFixed(2)} each</small>
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <div className="fw-bold text-primary">€{(Number(oi.item?.price || oi.price || 0) * (oi.quantity || 1)).toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center p-3 bg-primary-subtle rounded-3">
                          <div>
                            <div className="fw-bold text-dark fs-5">Total Amount</div>
                            <small className="text-muted">Including tray charge</small>
                          </div>
                          <div className="text-end">
                            <div className="display-6 fw-bold text-primary">€{Number(ord.total_price).toFixed(2)}</div>
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

      {/* Order History Button */}
      <div className="mb-4">
        <div className="d-flex justify-content-center">
          <button
            className="btn btn-outline-primary rounded-pill px-4 py-2 room-service-history-button"
            onClick={() => setShowOrderHistory(true)}
          >
            <i className="bi bi-clock-history me-2"></i>
            View Order History
          </button>
        </div>
      </div>

      {/* Menu Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center">
            <div className="bg-primary rounded-circle p-2 me-3">
              <i className="bi bi-menu-button-wide text-white fs-5"></i>
            </div>
            <div>
              <h3 className="mb-0">Our Menu</h3>
              <p className="text-muted mb-0">Fresh ingredients, prepared with care</p>
            </div>
          </div>
          <div className="badge bg-success-subtle text-success-emphasis border border-success px-3 py-2">
            <i className="bi bi-check-circle me-1"></i>{items.filter(item => item.is_on_stock).length} Available
          </div>
        </div>
        <div className="room-service-menu-container">
          {items.map((item) => {
            const price = Number(item.price) || 0;
            return (
                <div key={item.id} className={`card h-100 border-0 room-service-menu-item ${!item.is_on_stock ? 'out-of-stock' : ''}`}>
                  {item.image && (
                    <div className="position-relative overflow-hidden room-service-item-image">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-100 h-100"
                      />
                      {!item.is_on_stock && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center room-service-out-of-stock-overlay">
                          <span className="badge bg-danger fs-5 px-4 py-2 rounded-pill">Out of Stock</span>
                        </div>
                      )}
                      <div className="position-absolute top-0 end-0 m-3">
                        <span className="badge fs-5 px-4 py-2 fw-bold rounded-pill room-service-price-badge">
                          €{price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="card-body d-flex flex-column p-4">
                    <div className="mb-3">
                      <h5 className="card-title fw-bold text-dark mb-2">{item.name}</h5>
                      {!item.image && (
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fs-4 fw-bold text-primary">€{price.toFixed(2)}</span>
                          {!item.is_on_stock && (
                            <span className="badge bg-danger">Out of Stock</span>
                          )}
                        </div>
                      )}
                      <p className="card-text text-muted flex-grow-1 mb-0">{item.description}</p>
                    </div>
                    <div className="mt-auto">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <label className="form-label mb-0 fw-medium">Quantity:</label>
                        <div className="input-group room-service-quantity-input">
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={() => handleQuantityChange(item.id, Math.max(1, quantities[item.id] - 1))}
                            disabled={!item.is_on_stock || quantities[item.id] <= 1}
                          >
                            <i className="bi bi-dash"></i>
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={quantities[item.id]}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="form-control form-control-sm text-center border-0"
                            disabled={!item.is_on_stock}
                          />
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={() => handleQuantityChange(item.id, Math.min(99, quantities[item.id] + 1))}
                            disabled={!item.is_on_stock || quantities[item.id] >= 99}
                          >
                            <i className="bi bi-plus"></i>
                          </button>
                        </div>
                      </div>
                      <button
                        className={`btn w-100 room-service-add-to-cart ${item.is_on_stock ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleAddToOrder(item)}
                        disabled={!item.is_on_stock}
                      >
                        {item.is_on_stock ? (
                          <>
                            <i className="bi bi-cart-plus me-2"></i>Add to Order
                          </>
                        ) : (
                          <>
                            <i className="bi bi-x-circle me-2"></i>Unavailable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Button */}
      {Object.keys(orderItems).length > 0 && (
        <div className="position-fixed bottom-0 end-0 m-4">
          <button
            className={`btn btn-primary shadow-lg position-relative room-service-floating-cart ${showOrderPanel ? 'btn-warning' : ''}`}
            onClick={() => setShowOrderPanel((p) => !p)}
          >
            <i className={`bi bi-cart${showOrderPanel ? "-fill" : ""} me-2`}></i>
            View Cart ({Object.keys(orderItems).length})
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
              {Object.values(orderItems).reduce((sum, qty) => sum + qty, 0)}
              <span className="visually-hidden">items in cart</span>
            </span>
          </button>
        </div>
      )}

      {/* Order Panel */}
      {showOrderPanel && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1050 }}
          onClick={(e) => e.target === e.currentTarget && setShowOrderPanel(false)}
        >
          <div 
            className="position-absolute top-50 start-50 translate-middle bg-white rounded-4 shadow-lg room-service-order-panel"
          >
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h3 className="mb-1 text-dark fw-bold">
                    <i className="bi bi-cart-check me-2 text-primary"></i>Review Your Order
                  </h3>
                  <p className="text-muted mb-0">Room {roomNumber} • Double check before placing</p>
                </div>
                <button
                  className="btn-close"
                  onClick={() => setShowOrderPanel(false)}
                />
              </div>

              {Object.keys(orderItems).length > 0 ? (
                <>
                  {/* Order Items */}
                  <div className="mb-4">
                    <h5 className="mb-3 text-dark fw-semibold">
                      <i className="bi bi-bag-check me-2"></i>Order Items ({Object.keys(orderItems).length})
                    </h5>
                    <div className="bg-light rounded-3 p-3">
                      {Object.entries(orderItems).map(([id, qty]) => {
                        const item = items.find((i) => i.id === +id);
                        const price = Number(item?.price) || 0;
                        return (
                          <div key={id} className="d-flex justify-content-between align-items-center py-3 px-3 bg-white rounded-2 shadow-sm mb-2">
                            <div className="d-flex align-items-center flex-grow-1">
                              <div className="me-3">
                                <h6 className="mb-1 fw-semibold text-dark">{item?.name}</h6>
                                <small className="text-muted">€{price.toFixed(2)} each</small>
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <div className="input-group me-3" style={{ width: "120px" }}>
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  type="button"
                                  onClick={() => handleActiveQtyChange(item.id, Math.max(1, qty - 1))}
                                >
                                  <i className="bi bi-dash"></i>
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={qty}
                                  onChange={(e) => handleActiveQtyChange(item.id, e.target.value)}
                                  className="form-control form-control-sm text-center"
                                />
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  type="button"
                                  onClick={() => handleActiveQtyChange(item.id, Math.min(99, qty + 1))}
                                >
                                  <i className="bi bi-plus"></i>
                                </button>
                              </div>
                              <div className="text-end me-3" style={{ minWidth: '80px' }}>
                                <div className="fw-bold text-primary">€{(price * qty).toFixed(2)}</div>
                              </div>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => openDeleteModal(item.id)}
                                title="Remove item"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div className="mb-4">
                    <h5 className="mb-3 text-dark fw-semibold">
                      <i className="bi bi-chat-square-text me-2"></i>Special Instructions
                      <small className="text-muted fw-normal ms-2">(Optional)</small>
                    </h5>
                    <div className="bg-light rounded-3 p-3">
                      <textarea
                        className="form-control border-0"
                        rows="3"
                        placeholder="Any special requests? (e.g., no onions, extra spicy, allergies, delivery preferences...)"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        maxLength={500}
                        style={{ backgroundColor: 'white', resize: 'none' }}
                      />
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className="text-muted">
                          <i className="bi bi-info-circle me-1"></i>
                          Help our kitchen prepare your order exactly how you like it
                        </small>
                        <small className="text-muted">{specialInstructions.length}/500</small>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="mb-4">
                    <div className="bg-primary-subtle rounded-3 p-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-dark">Subtotal ({Object.values(orderItems).reduce((sum, qty) => sum + qty, 0)} items)</span>
                        <span className="text-dark fw-semibold">€{subTotal.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary">
                        <span className="text-muted small">
                          <i className="bi bi-truck me-1"></i>Tray & delivery charge
                        </span>
                        <span className="text-dark">€{trayCharge.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fs-5 fw-bold text-dark">Total Amount</span>
                        <span className="fs-4 fw-bold text-primary">€{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {submitError && (
                    <div className="alert alert-danger mb-4">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {String(submitError)}
                    </div>
                  )}

                  <button
                    className="btn btn-success w-100 py-3 fw-semibold fs-5"
                    onClick={handlePlaceOrder}
                    disabled={submitting || !Object.keys(orderItems).length}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>Place Order • €{total.toFixed(2)}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-cart-x text-muted" style={{ fontSize: '3rem' }}></i>
                  <h5 className="mt-3 text-muted">Your cart is empty</h5>
                  <p className="text-muted">Add some delicious items from our menu!</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowOrderPanel(false)}
                  >
                    <i className="bi bi-arrow-left me-2"></i>Back to Menu
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {showOrderHistory && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1050 }}
          onClick={(e) => e.target === e.currentTarget && setShowOrderHistory(false)}
        >
          <div 
            className="position-absolute top-50 start-50 translate-middle bg-white rounded-4 shadow-lg room-service-order-panel"
          >
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h3 className="mb-1 text-dark fw-bold">
                    <i className="bi bi-clock-history me-2 text-primary"></i>Order History
                  </h3>
                  <p className="text-muted mb-0">Room {roomNumber} • Your previous orders</p>
                </div>
                <button
                  className="btn-close"
                  onClick={() => setShowOrderHistory(false)}
                />
              </div>

              <div className="mb-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {previousOrders.filter(order => 
                  (order.status === 'completed' || order.status === 'cancelled') && 
                  order.room_number?.toString() === roomNumber?.toString()
                ).length > 0 ? (
                  <div className="room-service-orders-container">
                    {previousOrders
                      .filter(order => 
                        (order.status === 'completed' || order.status === 'cancelled') && 
                        order.room_number?.toString() === roomNumber?.toString()
                      )
                      .map((order) => (
                        <div key={order.id} className="card shadow-sm border-0 mb-3" style={{ 
                          borderLeft: order.status === 'completed' ? '4px solid #28a745' : '4px solid #dc3545'
                        }}>
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1 fw-bold">Order #{order.id}</h6>
                                <small className="text-muted">
                                  {new Date(order.created_at || order.timestamp).toLocaleDateString()}
                                </small>
                              </div>
                              <span className={`badge ${order.status === 'completed' ? 'bg-success' : 'bg-danger'}`}>
                                {order.status === 'completed' ? 'Completed' : 'Cancelled'}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <small className="text-muted d-block">Items:</small>
                              {order.items?.slice(0, 2).map((item, idx) => (
                                <small key={idx} className="d-block">
                                  {item.quantity}x {item.item?.name || item.name} - €{Number(item.item_price || item.price).toFixed(2)}
                                </small>
                              ))}
                              {order.items?.length > 2 && (
                                <small className="text-muted">... and {order.items.length - 2} more items</small>
                              )}
                            </div>
                            
                            <div className="d-flex justify-content-between align-items-center">
                              <small className="fw-bold">Total: €{Number(order.total_price).toFixed(2)}</small>
                              {order.status === 'completed' && (
                                <button className="btn btn-sm btn-outline-primary rounded-pill">
                                  <i className="bi bi-arrow-repeat me-1"></i>Reorder
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-inbox display-1 text-muted mb-3"></i>
                    <h5 className="text-muted">No order history yet</h5>
                    <p className="text-muted mb-0">Your completed and cancelled orders will appear here</p>
                  </div>
                )}
              </div>
            </div>
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
