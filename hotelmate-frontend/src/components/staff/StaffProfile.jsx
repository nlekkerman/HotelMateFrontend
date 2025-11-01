import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom"; // <-- added useParams
import StaffWeeklyRoster from "@/components/staff/StaffWeeklyRoster";
import {
  FaEnvelope,
  FaUserShield,
  FaPhone,
  FaBuilding,
  FaBriefcase,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const prettify = (v) =>
  (v || "N/A")
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function StaffProfile() {
  const navigate = useNavigate();
  const { hotelSlug } = useParams(); // 👈 get slug from route

  const fetchStaffMe = async () => {
    if (!hotelSlug) {
      throw new Error("Hotel slug is missing from URL");
    }
    const { data } = await api.get(`/staff/${hotelSlug}/me/`);
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
    enabled: !!hotelSlug, // run only when slug is available
  });

  const { user } = useAuth();
  const isOwnProfile = staff && user && staff.id === user.staff_id;

  // Editable state
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
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

  // Save field
  const handleEdit = (field) => {
    setEditField(field);
    if (field === "department") {
      setEditValue(staff.department_detail?.id || "");
    } else if (field === "role") {
      setEditValue(staff.role_detail?.id || "");
    } else if (field === "is_active" || field === "is_on_duty") {
      setEditValue(staff[field] ? "true" : "false");
    } else {
      setEditValue(staff[field] || "");
    }
    setEditError(null);
  };
  const handleCancel = () => {
    setEditField(null);
    setEditValue("");
    setEditError(null);
  };
  const handleSave = async () => {
    setEditError(null);
    let payload = {};
    if (editField === "department") {
      payload = { department: editValue };
    } else if (editField === "role") {
      payload = { role: editValue };
    } else if (editField === "is_active" || editField === "is_on_duty") {
      payload = { [editField]: editValue === "true" };
    } else {
      payload = { [editField]: editValue };
    }
    try {
      await api.patch(`/staff/${hotelSlug}/${staff.id}/`, payload);
      window.location.reload(); // reload to refetch
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail) {
        setEditError("You are not allowed to update this profile.");
      } else {
        setEditError("Failed to update. Try again.");
      }
    }
  };


  // Image upload
  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
    setImageError(null);
  };
  const handleImageUpload = async () => {
    if (!imageFile) return;
    setImageUploading(true);
    setImageError(null);
    const formData = new FormData();
    formData.append("profile_image", imageFile);
    try {
      await api.patch(`/staff/${hotelSlug}/${staff.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      window.location.reload();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail) {
        setImageError("You are not allowed to update this profile.");
      } else {
        setImageError("Failed to upload image.");
      }
    } finally {
      setImageUploading(false);
    }
  };

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

  const handleRegisterFace = () => {
    navigate(`/${hotelSlug}/staff/register-face`);
  };

  return (
    <div className="container py-4">
      {/* DEBUG: Show staff.id and user.staff_id */}
      <div className="alert alert-info mb-2">
        <div><b>Debug:</b> staff.id = {staff?.id?.toString()} | user.staff_id = {user?.staff_id?.toString()}</div>
        <div>isOwnProfile: {isOwnProfile ? 'true' : 'false'}</div>
      </div>
      <div className="d-flex flex-column g-4 justify-content-center align-items-center">
        {/* RIGHT: Weekly roster (8/12 on lg+, full width on small) */}
        <div className="col-12 col-lg-8 mb-4">
          <StaffWeeklyRoster staffId={staff.id} />
        </div>
        <div className="col-12 col-lg-4">
          <div className="card shadow border-0 h-100">

            <div className="card-header bg-primary text-white text-center">
              {!staff.profile_image_url && (
                <div className="mb-2">
                  <FaUserShield size={32} />
                </div>
              )}
              <h4 className="mb-0">Your Profile</h4>
              {isOwnProfile && (
                <div className="mt-2">
                  <label className="btn btn-sm btn-light">
                    Edit Image
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
                  </label>
                  {imageFile && (
                    <button className="btn btn-sm btn-success ms-2" onClick={handleImageUpload} disabled={imageUploading}>
                      {imageUploading ? "Uploading..." : "Save Image"}
                    </button>
                  )}
                  {imageError && <div className="text-danger small mt-1">{imageError}</div>}
                </div>
              )}
            </div>

            <div className="card-body text-center">
              {staff.profile_image_url && (
                <img
                  src={staff.profile_image_url}
                  alt={`${staff.first_name} ${staff.last_name}`}
                  className="rounded-circle mb-3"
                  style={{ width: 120, height: 120, objectFit: "cover" }}
                />
              )}


              <h5 className="card-title text-primary mb-4">
                {staff.first_name} {staff.last_name}
              </h5>
              {editError && <div className="text-danger small mb-2">{editError}</div>}

              <ul className="list-group list-group-flush text-start">

                <li className="list-group-item d-flex align-items-center">
                  <FaEnvelope className="me-2 text-secondary" />
                  <span className="flex-grow-1">Email:</span>
                  {editField === "email" ? (
                    <>
                      <input value={editValue} onChange={e => setEditValue(e.target.value)} className="form-control d-inline w-auto" />
                      <button className="btn btn-success btn-sm ms-2" onClick={handleSave}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="fw-semibold">{staff.email}</span>
                      {isOwnProfile && (
                        <button className="btn btn-link btn-sm ms-1" onClick={() => handleEdit("email")}>Edit</button>
                      )}
                    </>
                  )}
                </li>

                <li className="list-group-item d-flex align-items-center">
                  <FaUserShield className="me-2 text-secondary" />
                  <span className="flex-grow-1">Access Level:</span>
                  {editField === "access_level" ? (
                    <>
                      <input value={editValue} onChange={e => setEditValue(e.target.value)} className="form-control d-inline w-auto" />
                      <button className="btn btn-success btn-sm ms-2" onClick={handleSave}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="fw-semibold">{prettify(staff.access_level)}</span>
                      {isOwnProfile && (
                        <button className="btn btn-link btn-sm ms-1" onClick={() => handleEdit("access_level")}>Edit</button>
                      )}
                    </>
                  )}
                </li>


                <li className="list-group-item d-flex align-items-center">
                  <FaPhone className="me-2 text-secondary" />
                  <span className="flex-grow-1">Phone:</span>
                  {editField === "phone_number" ? (
                    <>
                      <input value={editValue} onChange={e => setEditValue(e.target.value)} className="form-control d-inline w-auto" />
                      <button className="btn btn-success btn-sm ms-2" onClick={handleSave}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="fw-semibold">{staff.phone_number || "N/A"}</span>
                      {isOwnProfile && (
                        <button className="btn btn-link btn-sm ms-1" onClick={() => handleEdit("phone_number")}>Edit</button>
                      )}
                    </>
                  )}
                </li>

                <li className="list-group-item d-flex align-items-center">
                  <FaBuilding className="me-2 text-secondary" />
                  <span className="flex-grow-1">Department:</span>
                  {editField === "department" ? (
                    <>
                      <select value={editValue} onChange={e => setEditValue(e.target.value)} className="form-select d-inline w-auto">
                        <option value="">-- Select Department --</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                      <button className="btn btn-success btn-sm ms-2" onClick={handleSave}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="fw-semibold">{staff.department_detail?.name || "N/A"}</span>
                      {isOwnProfile && (
                        <button className="btn btn-link btn-sm ms-1" onClick={() => handleEdit("department")}>Edit</button>
                      )}
                    </>
                  )}
                </li>

                <li className="list-group-item d-flex align-items-center">
                  <FaBriefcase className="me-2 text-secondary" />
                  <span className="flex-grow-1">Role:</span>
                  {editField === "role" ? (
                    <>
                      <select value={editValue} onChange={e => setEditValue(e.target.value)} className="form-select d-inline w-auto">
                        <option value="">-- Select Role --</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <button className="btn btn-success btn-sm ms-2" onClick={handleSave}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="fw-semibold">{staff.role_detail?.name || "N/A"}</span>
                      {isOwnProfile && (
                        <button className="btn btn-link btn-sm ms-1" onClick={() => handleEdit("role")}>Edit</button>
                      )}
                    </>
                  )}
                </li>

                <li className="list-group-item d-flex align-items-center">
                  {staff.is_active ? (
                    <FaToggleOn className="me-2 text-success" />
                  ) : (
                    <FaToggleOff className="me-2 text-secondary" />
                  )}
                  <span className="flex-grow-1">Status:</span>
                  {editField === "is_active" ? (
                    <>
                      <select value={editValue} onChange={e => setEditValue(e.target.value)} className="form-select d-inline w-auto">
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                      <button className="btn btn-success btn-sm ms-2" onClick={handleSave}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className={`badge ${staff.is_active ? "bg-success" : "bg-secondary"} text-capitalize`}>
                        {staff.is_active ? "Active" : "Inactive"}
                      </span>
                      {isOwnProfile && (
                        <button className="btn btn-link btn-sm ms-1" onClick={() => handleEdit("is_active")}>Edit</button>
                      )}
                    </>
                  )}
                </li>

                <li className="list-group-item d-flex align-items-center">
                  {staff.is_on_duty ? (
                    <FaToggleOn className="me-2 text-success" />
                  ) : (
                    <FaToggleOff className="me-2 text-danger" />
                  )}
                  <span className="flex-grow-1">On Duty:</span>
                  {editField === "is_on_duty" ? (
                    <>
                      <select value={editValue} onChange={e => setEditValue(e.target.value)} className="form-select d-inline w-auto">
                        <option value="true">On Duty</option>
                        <option value="false">Off Duty</option>
                      </select>
                      <button className="btn btn-success btn-sm ms-2" onClick={handleSave}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className={`badge ${staff.is_on_duty ? "bg-success" : "bg-danger"} text-capitalize`}>
                        {staff.is_on_duty ? "On Duty" : "Off Duty"}
                      </span>
                      {isOwnProfile && (
                        <button className="btn btn-link btn-sm ms-1" onClick={() => handleEdit("is_on_duty")}>Edit</button>
                      )}
                    </>
                  )}
                </li>
              </ul>

              {!staff.has_registered_face && (
                <div className="mt-4">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={handleRegisterFace}
                  >
                    Register Face Data
                  </button>
                </div>
              )}
            </div>

           
          </div>
        </div>
      </div>
    </div>
  );

}
