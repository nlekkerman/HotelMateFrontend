// src/hooks/useOrderCount.jsx

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import api from "@/services/api";
import { listenForFirebaseMessages } from "@/utils/firebaseNotifications";

// 1) Create context
const OrderCountContext = createContext({
  count:   0,
  refresh: () => Promise.resolve(),
});

// 2) Provider
export function OrderCountProvider({ children }) {
  const [count, setCount] = useState(0);

  // Fetch the initial count (scoped to the hotel slug you pass in below)
  const refresh = useCallback(async (hotelSlug) => {
    if (!hotelSlug) return;
    try {
      const res = await api.get(
        `/room_services/${hotelSlug}/orders/pending-count/`
      );
      setCount(res.data.count);
    } catch (err) {
      console.error("useOrderCount#refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    // We don’t know the hotelSlug here; it will be passed into refresh later
    // Listen for data-only FCM messages
    const unsubscribe = listenForFirebaseMessages((payload) => {
      if (payload.data?.type === "order_count") {
        setCount(Number(payload.data.count));
      }
    });

    // Listen for background-posted messages from the SW
    const onMessage = (event) => {
      const data = event.data;
      if (data?.type === "order_count") {
        setCount(Number(data.count));
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      unsubscribe();
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <OrderCountContext.Provider value={{ count, refresh }}>
      {children}
    </OrderCountContext.Provider>
  );
}

// 3) Custom hook
export function useOrderCount(hotelSlug) {
  const { count, refresh } = useContext(OrderCountContext);

  // Whenever the hotelSlug changes, re-fetch
  useEffect(() => {
    refresh(hotelSlug);
  }, [hotelSlug, refresh]);

  return { count, refresh: () => refresh(hotelSlug) };
}
