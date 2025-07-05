import { useParams, Navigate, useLocation } from "react-router-dom";

export default function RequireDinnerPin({ children }) {
  const { hotelSlug, restaurantSlug, roomNumber } = useParams();
  const location = useLocation();

  const pinKey = `pin_ok_${roomNumber}`;
  const isPinOk = sessionStorage.getItem(pinKey) === "true";

  if (!isPinOk) {
    return (
      <Navigate
        to={`/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/room/${roomNumber}/validate-dinner-pin`}
        state={{ next: location.pathname }}
        replace
      />
    );
  }

  return children;
}
