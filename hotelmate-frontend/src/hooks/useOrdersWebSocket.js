import { useEffect } from "react";

export default function useOrdersWebSocket(orderId, onMessage) {
  useEffect(() => {
    if (!orderId) return;

    console.log("[WS] VITE_WS_HOST =", import.meta.env.VITE_WS_HOST);

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = import.meta.env.VITE_WS_HOST;
    const wsUrl = `${protocol}://${host}/ws/orders/${orderId}/`;

    console.log(`[WS] connecting to ${wsUrl}`);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[WS] connection opened");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[WS] message received:", data);
        onMessage?.(data);
      } catch (err) {
        console.error("[WS] JSON parse error:", err, "raw data:", event.data);
      }
    };

    socket.onerror = (err) => {
      console.error("[WS] error:", err);
    };

    socket.onclose = (ev) => {
      console.log(`[WS] closed (code=${ev.code} reason=${ev.reason})`);
    };

    return () => {
      console.log("[WS] closing socket");
      socket.close();
    };
  }, [orderId, onMessage]);
}
