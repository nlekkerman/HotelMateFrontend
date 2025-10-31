import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useNavigate,useParams  } from "react-router-dom";

const StaffCreate = () => {
  const [users, setUsers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [staffData, setStaffData] = useState({
    first_name: "",
    last_name: "",
    department: "",
    role: "",
    access_level: "regular_staff",
    email: "",
    is_active: true,
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Log the current user object from localStorage
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      console.log("[StaffCreate] Current logged-in user from localStorage:", user);
    } catch (e) {
      console.warn("[StaffCreate] Could not parse user from localStorage.", e);
    }
    const fetchPendingRegistrations = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const hotelSlug = user?.hotel_slug;
        
        if (!hotelSlug) {
          setError("Hotel information not found");
          return;
        }

        // Fetch pending registrations for this hotel
        const response = await api.get(`staff/${hotelSlug}/pending-registrations/`);
        console.log("Pending registrations:", response.data);
        
        // Set the pending users list
        setUsers(response.data.pending_users || []);
        
        // Set hotel info from localStorage
        if (user?.hotel_id) {
          setSelectedHotelId(user.hotel_id);
          setHotels([{ id: user.hotel_id, name: user.hotel_name }]);
        }
      } catch (err) {
        setError("Failed to fetch pending registrations");
        console.error(err);
      }
    };

    const fetchAllPaginated = async (url) => {
      let allResults = [];
      let nextUrl = url;
      
      while (nextUrl) {
        const response = await api.get(nextUrl);
        const data = response.data;
        
        // Add current page results
        if (Array.isArray(data?.results)) {
          allResults = [...allResults, ...data.results];
        } else if (Array.isArray(data)) {
          allResults = [...allResults, ...data];
        }
        
        // Check if there's a next page
        nextUrl = data?.next ? data.next.replace(api.defaults.baseURL, '') : null;
      }
      
      return allResults;
    };

    const fetchMetadata = async () => {
      setLoading(true);
      try {
        console.log("🔍 Fetching ALL departments (handling pagination)...");
        
        // Fetch ALL departments (handle pagination)
        const deptList = await fetchAllPaginated("staff/departments/?page_size=100");
        console.log("✅ Fetched departments:", deptList);
        console.log("📏 Total departments count:", deptList.length);
        
        console.log("🔍 Fetching ALL roles (handling pagination)...");
        
        // Fetch ALL roles (handle pagination)
        const roleList = await fetchAllPaginated("staff/roles/?page_size=100");
        console.log("✅ Fetched roles:", roleList);
        console.log("📏 Total roles count:", roleList.length);
        
        if (deptList.length === 0) {
          console.warn("⚠️ No departments found in database!");
          setError("No departments found. Please create departments in Django admin first.");
        }
        
        if (roleList.length === 0) {
          console.warn("⚠️ No roles found in database!");
          setError("No roles found. Please create roles in Django admin first.");
        }
        
        setDepartments(deptList);
        setRoles(roleList);
      } catch (err) {
        console.error("❌ Failed to fetch metadata:", err);
        console.error("Error response:", err.response);
        console.error("Error data:", err.response?.data);
        setError(`Failed to load departments and roles: ${err.response?.data?.detail || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRegistrations();
    fetchMetadata();
  }, []);

  const openModal = (user) => {
    setSelectedUser(user);
    setStaffData({
      first_name: "",
      last_name: "",
      department: "",
      role: "",
      access_level: "regular_staff",
      email: "",
      is_active: true,
    });
    setError(null);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setError(null);
    setSelectedHotelId("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStaffData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedUser) {
    setError("Please select a user");
    return;
  }

  if (!staffData.department) {
    setError("Please select a department");
    return;
  }
  if (!staffData.role) {
    setError("Please select a role");
    return;
  }
  
  console.log("Creating staff profile for user:", selectedUser);

  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const hotelSlug = user?.hotel_slug;
    
    if (!hotelSlug) {
      setError("Hotel information not found");
      return;
    }

    // Prepare payload according to new backend API
    const payload = {
      user_id: selectedUser.user_id,  // from pending_users response
      first_name: staffData.first_name,
      last_name: staffData.last_name,
      email: staffData.email,
      department_id: Number(staffData.department),
      role_id: Number(staffData.role),
      access_level: staffData.access_level,
      is_active: staffData.is_active,
    };

    console.log("Sending staff creation payload:", payload);

    // Use the new backend endpoint: POST /api/staff/{hotel_slug}/create-staff/
    const response = await api.post(`staff/${hotelSlug}/create-staff/`, payload);

    console.log("Staff created successfully:", response.data);
    
    // Show success message
    alert(`Staff profile created! Registration code ${response.data.deleted_code} has been deleted.`);
    
    closeModal();

    // Navigate to the new staff member's profile
    const newStaffId = response.data.staff?.id;
    if (newStaffId) {
      navigate(`/staff/${newStaffId}`);
    } else {
      // Refresh the page to update the pending list
      window.location.reload();
    }
  } catch (err) {
    setError(err.response?.data?.error || "Failed to create staff");
    console.error("Staff creation error:", err);
  }
};

  return (
    <div className="container mt-4">
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Create New Staff</h2>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Error:</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          <h4 className="mb-3">Pending Registrations</h4>
          
          {loading && (
            <div className="alert alert-info">
              <i className="bi bi-hourglass-split me-2"></i>
              Loading departments and roles...
            </div>
          )}
          
          
          {users.length === 0 ? (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              No pending registrations. All users have staff profiles already.
            </div>
          ) : (
            <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {users.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => openModal(user)}
                  className="list-group-item list-group-item-action"
                >
                  <div className="d-flex w-100 justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">{user.username}</h5>
                      <small className="text-muted">
                        <i className="bi bi-key me-1"></i>
                        Code: {user.registration_code}
                      </small>
                      <br />
                      <small className="text-muted">
                        <i className="bi bi-calendar me-1"></i>
                        Registered: {new Date(user.registered_at).toLocaleString()}
                      </small>
                    </div>
                    <i className="bi bi-chevron-right text-primary"></i>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-person-plus me-2"></i>
                  Create Staff Profile for {selectedUser.username}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-bold">
                        <i className="bi bi-building me-2"></i>Hotel
                      </label>
                      <input
                        type="text"
                        value={hotels[0]?.name || "Loading..."}
                        readOnly
                        className="form-control bg-light"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-person me-2"></i>First Name *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={staffData.first_name}
                        onChange={handleChange}
                        required
                        className="form-control"
                        placeholder="Enter first name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-person me-2"></i>Last Name *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={staffData.last_name}
                        onChange={handleChange}
                        required
                        className="form-control"
                        placeholder="Enter last name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-diagram-3 me-2"></i>Department *
                      </label>
                      <select
                        name="department"
                        value={staffData.department}
                        onChange={handleChange}
                        required
                        className="form-select"
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-briefcase me-2"></i>Role *
                      </label>
                      <select
                        name="role"
                        value={staffData.role}
                        onChange={handleChange}
                        required
                        className="form-select"
                      >
                        <option value="">-- Select Role --</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-bold">
                        <i className="bi bi-envelope me-2"></i>Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={staffData.email}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="Enter email address"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        <i className="bi bi-shield-check me-2"></i>Access Level *
                      </label>
                      <select
                        name="access_level"
                        value={staffData.access_level}
                        onChange={handleChange}
                        required
                        className="form-select"
                      >
                        <option value="regular_staff">Regular Staff</option>
                        <option value="staff_admin">Staff Admin</option>
                        <option value="super_staff_admin">Super Staff Admin</option>
                      </select>
                    </div>

                    <div className="col-md-6 d-flex align-items-end">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={staffData.is_active}
                          onChange={handleChange}
                          className="form-check-input"
                          id="isActiveCheck"
                        />
                        <label className="form-check-label fw-bold" htmlFor="isActiveCheck">
                          <i className="bi bi-check-circle me-2"></i>Active
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer mt-4 border-top pt-3">
                    <button 
                      type="button" 
                      onClick={closeModal}
                      className="btn btn-secondary"
                    >
                      <i className="bi bi-x-circle me-2"></i>Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      <i className="bi bi-check-circle me-2"></i>
                      {loading ? 'Creating...' : 'Create Staff'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCreate;
