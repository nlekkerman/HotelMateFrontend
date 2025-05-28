// RequirePin.jsx
import { Navigate, useParams, useLocation } from "react-router-dom";

export default function RequirePin({ children }) {
  const { roomNumber } = useParams();
  const hasAccess = sessionStorage.getItem(`pin_ok_${roomNumber}`);
  const location = useLocation();

  if (!hasAccess) {
    return (
      <Navigate
        to={`/room/${roomNumber}/pin`}
        state={{ next: location.pathname }}
      />
    );
  }

  return children;
}
