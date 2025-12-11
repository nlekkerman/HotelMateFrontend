// Debug script for room service real-time events
// Copy this into browser console to monitor events

window.debugRoomService = {
  // Monitor all room service events
  startMonitoring() {
    console.log('🔍 Starting room service event monitoring...');
    
    // Monitor store state changes
    const originalDispatch = window.roomServiceDispatch || (() => {});
    window.roomServiceDispatch = function(action) {
      console.log('📦 [DEBUG] Room Service Store Action:', {
        type: action.type,
        payload: action.payload,
        timestamp: new Date().toISOString()
      });
      return originalDispatch(action);
    };
    
    // Monitor Pusher events
    if (window.pusher) {
      const channels = window.pusher.allChannels();
      channels.forEach(channel => {
        if (channel.name.includes('room-service')) {
          console.log('🎧 [DEBUG] Monitoring channel:', channel.name);
          channel.bind_global((eventName, data) => {
            if (!eventName.startsWith('pusher:')) {
              console.log('📡 [DEBUG] Pusher Event Received:', {
                channel: channel.name,
                eventName,
                data,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
      });
    }
    
    // Monitor custom events
    window.addEventListener('room-service-status-updated', (e) => {
      console.log('🔔 [DEBUG] Custom Event Received:', e.detail);
    });
  },
  
  // Test order creation
  simulateOrderCreated(orderId = 999) {
    console.log('🧪 [DEBUG] Simulating order_created event...');
    
    const testOrderData = {
      id: orderId,
      order_id: orderId,
      room_number: '101',
      status: 'pending',
      total_price: 25.50,
      items: [
        {
          id: 1,
          item: { name: 'Coffee' },
          quantity: 1,
          item_price: 5.50
        }
      ],
      created_at: new Date().toISOString(),
      type: 'room_service'
    };
    
    // Simulate Pusher event
    if (window.roomServiceActions) {
      window.roomServiceActions.handleEvent({
        category: 'room_service',
        type: 'order_created',
        payload: testOrderData
      });
    }
  },
  
  // Test order update
  simulateOrderUpdated(orderId = 999, newStatus = 'accepted') {
    console.log('🧪 [DEBUG] Simulating order_updated event...');
    
    const testOrderData = {
      id: orderId,
      order_id: orderId,
      room_number: '101',
      status: newStatus,
      total_price: 25.50,
      updated_at: new Date().toISOString()
    };
    
    // Simulate Pusher event
    if (window.roomServiceActions) {
      window.roomServiceActions.handleEvent({
        category: 'room_service',
        type: 'order_updated',
        payload: testOrderData
      });
    }
  },
  
  // Show current store state
  showState() {
    if (window.roomServiceState) {
      console.log('📊 [DEBUG] Current Room Service Store State:', {
        totalOrders: Object.keys(window.roomServiceState.ordersById).length,
        pendingCount: window.roomServiceState.pendingOrders.length,
        orders: window.roomServiceState.ordersById,
        pendingOrderIds: window.roomServiceState.pendingOrders
      });
    } else {
      console.warn('⚠️ Room service state not available');
    }
  }
};

// Auto-start monitoring
window.debugRoomService.startMonitoring();

console.log('🔧 Room service debugging tools loaded!');
console.log('Available commands:');
console.log('- window.debugRoomService.showState()');
console.log('- window.debugRoomService.simulateOrderCreated(orderId)');
console.log('- window.debugRoomService.simulateOrderUpdated(orderId, status)');