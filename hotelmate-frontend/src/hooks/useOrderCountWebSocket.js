// src/hooks/useOrderCountWebSocket.js
import { useEffect } from "react";

export default function useOrderCountWebSocket(hotelSlug, onMessage) {
  useEffect(() => {
    if (!hotelSlug) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host     = import.meta.env.VITE_WS_HOST;
    const wsUrl    = `${protocol}://${host}/ws/orders/${hotelSlug}/counts/`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "counts") {
          onMessage(data);
        }
      } catch (err) {
      }
    };

    socket.onerror = (err) => {
    };

    socket.onclose = (ev) => {
    };

    return () => {
      socket.close();
    };
  }, [hotelSlug, onMessage]);
}
