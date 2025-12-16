import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import StaffWeeklyRoster from "@/components/staff/StaffWeeklyRoster";
import StaffProfileCard from "./StaffProfileCard";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import "./staffProfile.css";

/**
 * Main Staff Profile Page
 * Displays weekly roster and profile information
 */
export default function StaffProfilePage() {
  const { hotelSlug } = useParams();

  const fetchStaffMe = async () => {
    if (!hotelSlug) {
      throw new Error("Hotel slug is missing from URL");
    }
    const { data } = await api.get(`/staff/hotel/${hotelSlug}/me/`);
    return data;
  };

  const {
    data: staff,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["staffMe", hotelSlug],
    queryFn: fetchStaffMe,
    enabled: !!hotelSlug,
  });

  const { user } = useAuth();
  const isOwnProfile = staff && user && staff.id === user.staff_id;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="alert alert-danger text-center">
          <strong>Error:</strong> {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 staff-profile-page">
      <div className="staff-profile-shell">
        <div className="row g-4 justify-content-center">
          {/* Weekly Roster - Left Side */}
          <div className="col-12 col-lg-8">
            <section className="staff-profile-section staff-roster-section">
              <h2 className="staff-section-title mb-3">
                Your Weekly Roster
              </h2>
              <StaffWeeklyRoster staffId={staff.id} hotelSlug={hotelSlug} />
            </section>
          </div>
          
          {/* Profile Card - Right Side */}
          <div className="col-12 col-lg-4">
            <section className="staff-profile-section staff-card-section">
              <StaffProfileCard
                staff={staff}
                isOwnProfile={isOwnProfile}
                hotelSlug={hotelSlug}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}