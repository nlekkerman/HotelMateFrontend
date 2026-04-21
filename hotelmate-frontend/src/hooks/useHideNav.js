// src/hooks/useHideNav.js
import { useLocation } from "react-router-dom";

const hiddenNavPaths = [
  // 1) Breakfast page
  /^\/room_services\/[^/]+\/room\/[^/]+\/breakfast\/?$/,

  // 2) RoomService menu page
  /^\/room_services\/[^/]+\/room\/[^/]+\/menu\/?$/,

  // 3) HotelInfo pages (both with and without category)
  /^\/hotel_info\/[^/]+(\/[^/]+)?\/?$/,
];

export default function useHideNav() {
  const { pathname } = useLocation();
  return hiddenNavPaths.some((re) => re.test(pathname));
}
