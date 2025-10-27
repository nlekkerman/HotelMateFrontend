import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import api from "@/services/api";

// 1) Create context
const OrderCountContext = createContext({
  roomServiceCount: 0,
  breakfastCount: 0,
  refreshAll: () => Promise.resolve(),
});

// 2) Provider
export function OrderCountProvider({ children }) {
  const [roomServiceCount, setRoomServiceCount] = useState(0);
  const [breakfastCount, setBreakfastCount] = useState(0);

  const refreshRoomService = useCallback(async (hotelSlug) => {
    if (!hotelSlug) return;
    try {
      const res = await api.get(`/room_services/${hotelSlug}/orders/pending-count/`);
      setRoomServiceCount(res.data.count);
    } catch (err) {
    }
  }, []);

  const refreshBreakfast = useCallback(async (hotelSlug) => {
    if (!hotelSlug) return;
    try {
const res = await api.get(`/room_services/${hotelSlug}/breakfast-orders/breakfast-pending-count/`);
      setBreakfastCount(res.data.count);
    } catch (err) {
    }
  }, []);

  const refreshAll = useCallback(async (hotelSlug) => {
    await Promise.all([
      refreshRoomService(hotelSlug),
      refreshBreakfast(hotelSlug),
    ]);
  }, [refreshRoomService, refreshBreakfast]);

  useEffect(() => {
    // Alternative: Use WebSocket or Pusher for real-time count updates
    // For now, we'll rely on periodic refreshes or manual updates
    const onMessage = (event) => {
      const { type, count } = event.data || {};
      if (type === "order_count") setRoomServiceCount(Number(count));
      if (type === "breakfast_count") setBreakfastCount(Number(count));
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <OrderCountContext.Provider value={{ roomServiceCount, breakfastCount, refreshAll }}>
      {children}
    </OrderCountContext.Provider>
  );
}

// 3) Custom hook
export function useOrderCount(hotelSlug) {
  const { roomServiceCount, breakfastCount, refreshAll } = useContext(OrderCountContext);

  useEffect(() => {
    refreshAll(hotelSlug);
  }, [hotelSlug, refreshAll]);

  return {
    roomServiceCount,
    breakfastCount,
    totalServiceCount: roomServiceCount + breakfastCount,
    refreshAll: () => refreshAll(hotelSlug),
  };
}
