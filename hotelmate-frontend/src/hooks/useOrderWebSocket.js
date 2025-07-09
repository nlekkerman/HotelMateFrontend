import { useEffect } from "react";

export default function useOrderWebSocket(orderId, onMessage) {
  useEffect(() => {
    if (!orderId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // dynamically use the same host/domain your page is served from:
    const host = window.location.host;
    const wsUrl = `${protocol}://${host}/ws/orders/${orderId}/`;

    const socket = new WebSocket(wsUrl);
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      onMessage?.(data);
    };
    socket.onclose = () => console.log("WebSocket closed");

    return () => socket.close();
  }, [orderId, onMessage]);
}
