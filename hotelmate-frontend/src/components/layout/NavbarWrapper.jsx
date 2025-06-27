// components/nav/NavbarWrapper.jsx
import { useMediaQuery } from "react-responsive";
import MobileNavbar from "./MobileNavbar";
import DesktopSidebarNavbar from "./DesktopSidebarNavbar";

export default function NavbarWrapper({ collapsed, setCollapsed }) {
  const isMobile = useMediaQuery({ maxWidth: 991 });

  return isMobile
    ? <MobileNavbar />
    : <DesktopSidebarNavbar collapsed={collapsed} setCollapsed={setCollapsed} />;
}

