import { useEffect } from "react";

export default function useOrderWebSocket(orderId, onMessage) {
  useEffect(() => {
    if (!orderId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host     = import.meta.env.VITE_WS_HOST; 
    const wsUrl    = `${protocol}://${host}/ws/orders/${orderId}/`;

    console.log(`[WS] connecting to ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[WS] connection opened");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("[WS] message received:", data);
      onMessage?.(data);
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
