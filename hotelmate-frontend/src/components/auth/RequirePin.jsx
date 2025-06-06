import { Navigate, useParams, useLocation } from "react-router-dom";

export default function RequirePin({ children }) {
  const { roomNumber, hotelIdentifier } = useParams();
  const hasAccess = sessionStorage.getItem(`pin_ok_${roomNumber}`);
  const location = useLocation();

  if (!hasAccess) {
    return (
      <Navigate
        to={`/${hotelIdentifier}/room/${roomNumber}/validate-pin`}
        state={{ next: location.pathname }} // this is key
        replace
      />
    );
  }

  return children;
}
