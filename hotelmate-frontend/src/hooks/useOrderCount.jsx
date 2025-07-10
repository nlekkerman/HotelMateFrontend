import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import api from "@/services/api";
import useOrderCountWebSocket from "@/hooks/useOrderCountWebSocket";

// 1) Create context
const OrderCountContext = createContext({
  roomServiceCount: 0,
  breakfastCount: 0,
  refreshAll: () => Promise.resolve(),
});

// 2) Provider
export function OrderCountProvider({ hotelSlug, children }) {
  const [roomServiceCount, setRoomServiceCount] = useState(0);
  const [breakfastCount, setBreakfastCount] = useState(0);

  // Fallback REST fetch
  const refreshRoomService = useCallback(async () => {
    if (!hotelSlug) return;
    try {
      const res = await api.get(
        `/room_services/${hotelSlug}/orders/pending-count/`
      );
      setRoomServiceCount(res.data.count);
    } catch (err) {
      console.error("Room Service count fetch failed:", err);
    }
  }, [hotelSlug]);

  const refreshBreakfast = useCallback(async () => {
    if (!hotelSlug) return;
    try {
      const res = await api.get(
        `/room_services/${hotelSlug}/breakfast-orders/breakfast-pending-count/`
      );
      setBreakfastCount(res.data.count);
    } catch (err) {
      console.error("Breakfast count fetch failed:", err);
    }
  }, [hotelSlug]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshRoomService(), refreshBreakfast()]);
  }, [refreshRoomService, refreshBreakfast]);

  // WebSocket listener for counts
  useOrderCountWebSocket(hotelSlug, (msg) => {
    setRoomServiceCount(msg.pending_orders);
    setBreakfastCount(msg.pending_breakfast);
  });

  // Initial data load
  useEffect(() => {
    if (hotelSlug) refreshAll();
  }, [hotelSlug, refreshAll]);

  return (
    <OrderCountContext.Provider
      value={{ roomServiceCount, breakfastCount, refreshAll }}
    >
      {children}
    </OrderCountContext.Provider>
  );
}

// 3) Custom hook
export function useOrderCount(hotelSlug) {
  const { roomServiceCount, breakfastCount, refreshAll } = useContext(
    OrderCountContext
  );

  useEffect(() => {
    if (hotelSlug) refreshAll();
  }, [hotelSlug, refreshAll]);

  return {
    roomServiceCount,
    breakfastCount,
    totalServiceCount: roomServiceCount + breakfastCount,
    refreshAll,
  };
}
