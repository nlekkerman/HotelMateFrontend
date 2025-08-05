import { useEffect } from "react";

export default function useOrdersWebSocket(orderId, onMessage) {
  useEffect(() => {
    if (!orderId) return;

    const locationProtocol = window.location.protocol;
    console.log("[WS] window.location.protocol =", locationProtocol);
    console.log("[WS] VITE_WS_HOST =", import.meta.env.VITE_WS_HOST);

    const protocol = locationProtocol === "https:" ? "wss" : "ws";

    // Fallback to window.location.host if VITE_WS_HOST is undefined or empty
    const host = import.meta.env.VITE_WS_HOST || window.location.host;

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
