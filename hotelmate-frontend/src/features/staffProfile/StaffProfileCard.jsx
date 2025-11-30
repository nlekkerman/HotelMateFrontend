import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FaEnvelope,
  FaUserShield,
  FaPhone,
  FaBuilding,
  FaBriefcase,
} from "react-icons/fa";
import api from "@/services/api";
import StaffImageUploader from "./StaffImageUploader";
import StaffFieldRow from "./StaffFieldRow";
import StaffStatusRow from "./StaffStatusRow";
import StaffFaceRegistrationCTA from "./StaffFaceRegistrationCTA";

const prettify = (v) =>
  (v || "N/A")
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Staff Profile Card Component
 * Displays staff information with inline editing capabilities
 */
export default function StaffProfileCard({ staff, isOwnProfile, hotelSlug }) {
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fetch departments and roles (paginated)
    const fetchAllPaginated = async (url) => {
      let allResults = [];
      let nextUrl = url;
      while (nextUrl) {
        const response = await api.get(nextUrl);
        const data = response.data;
        if (Array.isArray(data?.results)) {
          allResults = [...allResults, ...data.results];
        } else if (Array.isArray(data)) {
          allResults = [...allResults, ...data];
        }
        nextUrl = data?.next ? data.next.replace(api.defaults.baseURL, '') : null;
      }
      return allResults;
    };

    const fetchMetadata = async () => {
      try {
        const deptList = await fetchAllPaginated("staff/departments/?page_size=100");
        const roleList = await fetchAllPaginated("staff/roles/?page_size=100");
        setDepartments(deptList);
        setRoles(roleList);
      } catch (err) {
        // ignore for now
      }
    };
    
    fetchMetadata();
  }, []);

  const handleSaveField = async (fieldKey, newValue) => {
    let payload = {};
    
    if (fieldKey === "department") {
      payload = { department: newValue };
    } else if (fieldKey === "role") {
      payload = { role: newValue };
    } else if (fieldKey === "is_active" || fieldKey === "is_on_duty") {
      payload = { [fieldKey]: newValue === "true" || newValue === true };
    } else {
      payload = { [fieldKey]: newValue };
    }

    await api.patch(`/staff/${hotelSlug}/${staff.id}/`, payload);
    await queryClient.invalidateQueries({ queryKey: ["staffMe", hotelSlug] });
  };

  // Prepare field options
  const departmentOptions = departments.map(dept => ({
    value: dept.id,
    label: dept.name
  }));

  const roleOptions = roles.map(role => ({
    value: role.id,
    label: role.name
  }));

  return (
    <div className="card staff-profile-card shadow border-0 h-100">
      <div className="card-header bg-primary text-white text-center">
        {!staff.profile_image_url && (
          <div className="mb-2">
            <FaUserShield size={32} />
          </div>
        )}
        <h4 className="mb-0">Your Profile</h4>
      </div>

      <div className="card-body">
        <div className="staff-profile-header text-center">
          {staff.profile_image_url ? (
            <img
              src={staff.profile_image_url}
              alt={`${staff.first_name} ${staff.last_name}`}
              className="staff-profile-avatar mb-3"
            />
          ) : (
            <div className="staff-profile-avatar-placeholder mb-3">
              <FaUserShield size={32} />
            </div>
          )}

          <h5 className="mb-1">
            {staff.first_name} {staff.last_name}
          </h5>
          <p className="text-muted small mb-0">
            {staff.role_detail?.name || "Staff"}
          </p>

          {isOwnProfile && (
            <StaffImageUploader
              staff={staff}
              hotelSlug={hotelSlug}
              isOwnProfile={isOwnProfile}
            />
          )}
        </div>

        <ul className="list-group list-group-flush text-start">
          <StaffFieldRow
            icon={<FaEnvelope />}
            label="Email"
            fieldKey="email"
            valueDisplay={staff.email}
            type="text"
            canEdit={isOwnProfile}
            onSave={handleSaveField}
          />

          <StaffFieldRow
            icon={<FaUserShield />}
            label="Access Level"
            fieldKey="access_level"
            valueDisplay={prettify(staff.access_level)}
            type="text"
            canEdit={isOwnProfile}
            onSave={handleSaveField}
          />

          <StaffFieldRow
            icon={<FaPhone />}
            label="Phone"
            fieldKey="phone_number"
            valueDisplay={staff.phone_number}
            type="text"
            canEdit={isOwnProfile}
            onSave={handleSaveField}
          />

          <StaffFieldRow
            icon={<FaBuilding />}
            label="Department"
            fieldKey="department"
            valueDisplay={staff.department_detail?.name}
            type="select"
            options={departmentOptions}
            canEdit={isOwnProfile}
            onSave={handleSaveField}
          />

          <StaffFieldRow
            icon={<FaBriefcase />}
            label="Role"
            fieldKey="role"
            valueDisplay={staff.role_detail?.name}
            type="select"
            options={roleOptions}
            canEdit={isOwnProfile}
            onSave={handleSaveField}
          />

          <StaffStatusRow
            label="Status"
            value={staff.is_active}
            fieldKey="is_active"
            canEdit={isOwnProfile}
            onSave={handleSaveField}
          />

          <StaffStatusRow
            label="On Duty"
            value={staff.is_on_duty}
            fieldKey="is_on_duty"
            canEdit={isOwnProfile}
            onSave={handleSaveField}
          />
        </ul>

        <StaffFaceRegistrationCTA
          staff={staff}
          hotelSlug={hotelSlug}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </div>
  );
}