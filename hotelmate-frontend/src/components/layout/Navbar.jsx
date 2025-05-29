import React, { useState, useEffect } from "react";
import { Link, useLocation,useNavigate  } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const [staffProfile, setStaffProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    async function fetchStaffProfile() {
      if (!user) {
        setStaffProfile(null);
        return;
      }

      try {
        const res = await api.get("/staff/me/");
        setStaffProfile(res.data);
        setIsOnDuty(res.data.is_on_duty || false);
      } catch (error) {
        console.error("Failed to fetch staff profile", error);
        setStaffProfile(null);
      }
    }

    fetchStaffProfile();
  }, [user]);

  const isActive = (path) => location.pathname === path;
  const isAdminOrSuperUser = user && (user.is_staff || user.is_superuser);
  const isStaff = !!staffProfile;

  const toggleNavbar = () => {
    setIsNavbarCollapsed(!isNavbarCollapsed);
  };

  // Close navbar on link click (mobile)
  const handleNavLinkClick = () => {
    if (!isNavbarCollapsed) setIsNavbarCollapsed(true);
  };
const handleLogout = () => {
  logout();           // clear user & localStorage
  handleNavLinkClick(); // close navbar if open (mobile)
  navigate('/login');  // redirect to login page
};
  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bold" to="/">
            🏨 HotelMate
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            aria-controls="navbarSupportedContent"
            aria-expanded={!isNavbarCollapsed}
            aria-label="Toggle navigation"
            onClick={toggleNavbar}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className={`collapse navbar-collapse ${!isNavbarCollapsed ? "show" : ""}`}
            id="navbarSupportedContent"
          >
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3">
              <li className="nav-item">
                <button
                  className={`btn btn-${isOnDuty ? "success" : "danger"}`}
                  onClick={() => setIsModalOpen(true)}
                  disabled={!staffProfile}
                >
                  {isOnDuty ? "Clock Out" : "Clock In"}
                </button>
              </li>

              {!user && (
                <>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive("/login") ? "active" : ""}`}
                      to="/login"
                      onClick={handleNavLinkClick}
                    >
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive("/register") ? "active" : ""}`}
                      to="/register"
                      onClick={handleNavLinkClick}
                    >
                      Register
                    </Link>
                  </li>
                </>
              )}

              {isAdminOrSuperUser && (
                <>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive("/rooms") ? "active" : ""}`}
                      to="/rooms"
                      onClick={handleNavLinkClick}
                    >
                      Rooms
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive("/reception") ? "active" : ""}`}
                      to="/reception"
                      onClick={handleNavLinkClick}
                    >
                      Reception
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive("/guests") ? "active" : ""}`}
                      to="/guests"
                      onClick={handleNavLinkClick}
                    >
                      Guests
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${isActive("/staff") ? "active" : ""}`}
                      to="/staff"
                      onClick={handleNavLinkClick}
                    >
                      Staff
                    </Link>
                  </li>
                </>
              )}

              {isStaff && (
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/staff/me") ? "active" : ""}`}
                    to="/staff/me"
                    onClick={handleNavLinkClick}
                  >
                    Profile
                  </Link>
                </li>
              )}

              {user && (
                <li className="nav-item">
                  <button className="btn btn-link nav-link" onClick={() => { logout(); handleLogout(); }}>
                    Logout
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {isStaff && (
        <ClockModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          staffId={staffProfile?.id}
          initialStatus={isOnDuty}
          onStatusChange={setIsOnDuty}
        />
      )}
    </>
  );
};

export default Navbar;
