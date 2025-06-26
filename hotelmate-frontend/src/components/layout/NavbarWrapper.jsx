// components/nav/NavbarWrapper.jsx
import { useMediaQuery } from "react-responsive";
import MobileNavbar from "./MobileNavbar";
import DesktopSidebarNavbar from "./DesktopSidebarNavbar";

export default function NavbarWrapper() {
  const isMobile = useMediaQuery({ maxWidth: 991 });

  return isMobile ? <MobileNavbar /> : <DesktopSidebarNavbar />;
}
