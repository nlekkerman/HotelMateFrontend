import { useEffect } from "react";

export default function useOrdersWebSocket(orderId, onMessage) {
  useEffect(() => {
  if (!orderId) return;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const wsUrl = `${protocol}://${host}/ws/orders/${orderId}/`;

  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage?.(data);
  };

  socket.onerror = (err) => {
  };

  socket.onclose = (ev) => {
  };

  return () => {
    socket.close();
  };
}, [orderId, onMessage]);

}
