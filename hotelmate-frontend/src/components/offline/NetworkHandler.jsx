import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function NetworkHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => {
      if (location.pathname === "/no-internet") {
        navigate("/", { replace: true });
      }
    };

    const handleOffline = () => {
      if (location.pathname !== "/no-internet") {
        navigate("/no-internet", { replace: true });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    if (!navigator.onLine && location.pathname !== "/no-internet") {
      navigate("/no-internet", { replace: true });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navigate, location]);

  return null; // No UI, just side effects
}
