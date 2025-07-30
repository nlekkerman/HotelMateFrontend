import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useNavigate } from "react-router-dom";

const StaffCreate = () => {
  const [users, setUsers] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [staffData, setStaffData] = useState({
    first_name: "",
    last_name: "",
    department: "",
    role: "",
    access_level: "regular_staff",
    email: "",
    phone_number: "",
    is_active: true,
    is_on_duty: false,
  });
  const [profileImage, setProfileImage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
  const fetchUsers = async () => {
    try {
      const response = await api.get("staff/users/");
      setUsers(response.data.results || response.data);
    } catch (err) {
      setError("Failed to fetch users");
      console.error(err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const res = await api.get("staff/metadata/");
      setDepartments(res.data.departments || []);
      setRoles(res.data.roles || []);
      // You can also use res.data.access_levels if needed
    } catch (err) {
      console.error("Failed to fetch metadata", err);
    }
  };

  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.hotel_id) {
    setSelectedHotelId(user.hotel_id);
    setHotels([{ id: user.hotel_id, name: user.hotel_name }]);
  }

  fetchUsers();
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
      phone_number: "",
      is_active: true,
      is_on_duty: false,
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

  const handleFileChange = (e) => {
    setProfileImage(e.target.files[0] || null);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!selectedUser) {
    setError("Please select a user");
    return;
  }

  if (!selectedHotelId) {
    setError("Please select a hotel");
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
  console.log("Profile image file:", profileImage);

  try {
    // Create FormData instance for multipart/form-data request
    const formData = new FormData();
    formData.append("user_id", selectedUser.id);
    formData.append("hotel", selectedHotelId);
    formData.append("first_name", staffData.first_name);
    formData.append("last_name", staffData.last_name);
    formData.append("department", Number(staffData.department));
    formData.append("role", Number(staffData.role));
    formData.append("access_level", staffData.access_level);
    formData.append("email", staffData.email);
    formData.append("phone_number", staffData.phone_number);
    formData.append("is_active", staffData.is_active);
    formData.append("is_on_duty", staffData.is_on_duty);

    if (profileImage) {
      formData.append("profile_image", profileImage); // key name matches your backend field
    }

    const response = await api.post("staff/", formData, {
      headers: {
        "X-Hotel-ID": selectedHotelId,
      },
    });

    console.log("Staff created:", response.data);
    closeModal();

    const newStaffId = response.data.id;
    if (newStaffId) {
      navigate(`/staff/${newStaffId}`);
    } else {
      setError("Staff created but ID missing in response");
    }
  } catch (err) {
    setError(err.response?.data?.error || "Failed to create staff");
    console.error(err);
  }
};

  return (
    <div>
      <h2>Create New Staff</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}

      <h3>Select User</h3>
      <ul
        style={{
          maxHeight: 300,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: 10,
        }}
      >
        {users.map((user) => (
          <li
            key={user.id}
            onClick={() => openModal(user)}
            style={{
              cursor: "pointer",
              padding: 5,
              borderBottom: "1px solid #eee",
            }}
          >
            {user.username} ({user.email})
          </li>
        ))}
      </ul>

      {selectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: 20,
              borderRadius: 5,
              minWidth: 320,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3>Create Staff for {selectedUser.username}</h3>

            <form onSubmit={handleSubmit}>
              <div>
                <label>Hotel</label>
                <input
                  type="text"
                  value={hotels[0]?.name || "Loading..."}
                  readOnly
                  className="form-control"
                />
              </div>

              <div>
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={staffData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={staffData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>Department</label>
                <select
                  name="department"
                  value={staffData.department}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Role</label>
                <select
                  name="role"
                  value={staffData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={staffData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  value={staffData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Profile Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <label>Access Level</label>
                <select
                  name="access_level"
                  value={staffData.access_level}
                  onChange={handleChange}
                  required
                >
                  <option value="regular_staff">Regular Staff</option>
                  <option value="staff_admin">Staff Admin</option>
                  <option value="super_staff_admin">Super Staff Admin</option>
                </select>
              </div>

              <div>
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={staffData.is_active}
                    onChange={handleChange}
                  />
                  Active
                </label>
              </div>

              <div>
                <label>
                  <input
                    type="checkbox"
                    name="is_on_duty"
                    checked={staffData.is_on_duty}
                    onChange={handleChange}
                  />
                  On Duty
                </label>
              </div>

              <button type="submit">Create Staff</button>
              <button
                type="button"
                onClick={closeModal}
                style={{ marginLeft: 10 }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCreate;
