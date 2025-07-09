import { useEffect } from "react";

export default function useOrderWebSocket(orderId, onMessage) {
  useEffect(() => {
    if (!orderId) return;import { useEffect } from "react";

export default function useOrderWebSocket(orderId, onMessage) {
  useEffect(() => {
    if (!orderId) return;

    const isSecure = window.location.protocol === "https:";
    const protocol = isSecure ? "wss" : "ws";
    const host =
      process.env.VITE_WS_HOST ||
      window.location.host.replace(/:\d+$/, ""); // strip port if any
    const wsUrl = `${protocol}://${host}/ws/orders/${orderId}/`;

    console.log(`[WS] connecting to ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("[WS] connection opened");
    socket.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      console.log("[WS] message received:", data);
      onMessage?.(data);
    };
    socket.onerror = (err) => console.error("[WS] error:", err);
    socket.onclose = (ev) =>
      console.log(`[WS] closed (code=${ev.code} reason=${ev.reason})`);

    return () => {
      console.log("[WS] closing socket");
      socket.close();
    };
  }, [orderId, onMessage]);
}


    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host     = window.location.host;
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
