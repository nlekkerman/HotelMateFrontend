// src/components/layout/Navbar.jsx

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug; // hotel slug from localStorage via AuthContext
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
  const handleNavLinkClick = () => {
    if (!isNavbarCollapsed) setIsNavbarCollapsed(true);
  };
  const handleLogout = () => {
    logout();
    handleNavLinkClick();
    navigate("/login");
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
            className={`collapse navbar-collapse ${
              !isNavbarCollapsed ? "show" : ""
            }`}
            id="navbarSupportedContent"
          >
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3">
              {/* Clock In/Out (Staff only) */}
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
                      className={`nav-link ${
                        isActive("/login") ? "active" : ""
                      }`}
                      to="/login"
                      onClick={handleNavLinkClick}
                    >
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${
                        isActive("/register") ? "active" : ""
                      }`}
                      to="/register"
                      onClick={handleNavLinkClick}
                    >
                      Register
                    </Link>
                  </li>
                </>
              )}

              {user && (
                <>
                  {/* Rooms (Admin only) */}
                  {isAdminOrSuperUser && (
                    <li className="nav-item">
                      <Link
                        className={`nav-link ${
                          isActive("/rooms") ? "active" : ""
                        }`}
                        to="/rooms"
                        onClick={handleNavLinkClick}
                      >
                        Rooms
                      </Link>
                    </li>
                  )}

                  {/* Guests (Admin only) */}
                  {isAdminOrSuperUser && (
                    <li className="nav-item">
                      <Link
                        className={`nav-link ${
                          isActive(`/${hotelIdentifier}/guests`) ? "active" : ""
                        }`}
                        to={`/${hotelIdentifier}/guests`}
                        onClick={handleNavLinkClick}
                      >
                        Guests
                      </Link>
                    </li>
                  )}

                  {/* Staff List (Admin only) */}
                  {isAdminOrSuperUser && (
                    <li className="nav-item">
                      <Link
                        className={`nav-link ${
                          isActive("/staff") ? "active" : ""
                        }`}
                        to="/staff"
                        onClick={handleNavLinkClick}
                      >
                        Staff
                      </Link>
                    </li>
                  )}

                  {/* Profile (Staff only) */}
                  {isStaff && (
                    <li className="nav-item">
                      <Link
                        className={`nav-link ${
                          isActive("/staff/me") ? "active" : ""
                        }`}
                        to="/staff/me"
                        onClick={handleNavLinkClick}
                      >
                        Profile
                      </Link>
                    </li>
                  )}

                  {/* ───────────────────────── */}
                  {/* NEW: Bookings Link */}
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${
                        isActive("/bookings") ? "active" : ""
                      }`}
                      to="/bookings"
                      onClick={handleNavLinkClick}
                    >
                      Bookings
                    </Link>
                  </li>

                  {/* Logout */}
                  <li className="nav-item">
                    <button
                      className="btn btn-link nav-link"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </li>
                </>
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
