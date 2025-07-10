// src/hooks/useOrderCountWebSocket.js
import { useEffect } from "react";

export default function useOrderCountWebSocket(hotelSlug, onMessage) {
  useEffect(() => {
    if (!hotelSlug) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host     = import.meta.env.VITE_WS_HOST;
    const wsUrl    = `${protocol}://${host}/ws/orders/${hotelSlug}/counts/`;

    console.log(`[WS] connecting to ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[WS] counts socket opened");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "counts") {
          console.log("[WS] counts received:", data);
          onMessage(data);
        }
      } catch (err) {
        console.error("[WS] counts parse error:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("[WS] counts socket error:", err);
    };

    socket.onclose = (ev) => {
      console.log(`[WS] counts socket closed (code=${ev.code})`);
    };

    return () => {
      console.log("[WS] closing counts socket");
      socket.close();
    };
  }, [hotelSlug, onMessage]);
}
