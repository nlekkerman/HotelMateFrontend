import { useEffect } from "react";

export default function useOrderWebSocket(orderId, onMessage) {
  useEffect(() => {
    if (!orderId) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = "localhost:8000"; // ← Use your Django backend here
    const wsUrl = `${protocol}://${wsHost}/ws/orders/${orderId}/`;

    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data); 
      if (onMessage) onMessage(data);
    };

    socket.onclose = () => console.log("WebSocket closed");

    return () => socket.close();
  }, [orderId, onMessage]);
}
