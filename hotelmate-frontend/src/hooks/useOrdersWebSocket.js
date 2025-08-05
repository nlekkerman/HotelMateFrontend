import { useEffect } from "react";

export default function useOrdersWebSocket(hotelSlug, orderId, onMessage) {
  useEffect(() => {
    console.log("[WS] useOrdersWebSocket effect triggered");
    console.log("[WS] hotelSlug:", hotelSlug);
    console.log("[WS] orderId:", orderId);

    if (!hotelSlug || !orderId) {
      console.warn("[WS] Missing hotelSlug or orderId, skipping WebSocket init");
      return;
    }

    const currentProtocol = window.location.protocol;
    console.log("[WS] current page protocol:", currentProtocol);

    const protocol = currentProtocol === "https:" ? "wss" : "ws";
    const host = import.meta.env.VITE_WS_HOST;

    if (!host) {
      console.error("[WS] VITE_WS_HOST is not defined in env variables");
      return;
    }

    const wsUrl = `${protocol}://${host}/ws/orders/${hotelSlug}/${orderId}/`;

    console.log(`[WS] constructed WebSocket URL: ${wsUrl}`);

    let socket;

    try {
      socket = new WebSocket(wsUrl);
    } catch (err) {
      console.error("[WS] Error creating WebSocket:", err);
      return;
    }

    socket.onopen = () => {
      console.log("[WS] connection opened:", socket.url);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[WS] message received:", data);
        onMessage?.(data);
      } catch (err) {
        console.error("[WS] failed to parse message:", event.data, err);
      }
    };

    socket.onerror = (err) => {
      console.error("[WS] connection error:", err);
    };

    socket.onclose = (ev) => {
      console.log(`[WS] connection closed (code=${ev.code}, reason="${ev.reason}")`);
    };

    return () => {
      console.log("[WS] cleaning up, closing socket:", socket?.url);
      socket?.close();
    };
  }, [hotelSlug, orderId, onMessage]);
}

