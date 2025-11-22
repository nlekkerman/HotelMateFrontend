// components/nav/NavbarWrapper.jsx
import { useMediaQuery } from "react-responsive";
import MobileNavbar from "./MobileNavbar";
import BigScreenNavbar from "./BigScreenNavbar";

export default function NavbarWrapper({ collapsed, setCollapsed }) {
  const isMobile = useMediaQuery({ maxWidth: 991 });

  return isMobile
    ? <MobileNavbar />
    : <BigScreenNavbar collapsed={collapsed} setCollapsed={setCollapsed} />;
}

