import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import useAxiosPost from "@/hooks/useAxiosPost";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Pass the endpoint here (no need to pass it on postData calls)
  const {
    postData,
    loading,
    error: requestError,
  } = useAxiosPost("staff/login/");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    console.log("[Login] Hook error updated:", requestError);
    setError(requestError);
  }, [requestError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    console.log("[Login] Submitting login with:", { username, password });

    try {
      // Only pass the data here, not the endpoint
      const data = await postData({ username, password });
      console.log("[Login] Login response data:", data);

      login({
        username: data.username,
        token: data.token,
        isAdmin: data.is_staff || data.is_superuser || false,
        is_staff: data.is_staff || false,
        is_superuser: data.is_superuser || false,
      });

      console.log("[Login] Login success, navigating to /rooms");
      navigate("/reception");
    } catch (err) {
      console.error("[Login] Login failed with error:", err);
      // error state already set by hook
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
    console.log("[Login] Toggled password visibility:", !showPassword);
  };

  return (
    <div className="container mt-4">
      <h2>Login</h2>
      {error && (
        <div className="alert alert-danger">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}
      <form onSubmit={handleSubmit} className="w-50">
        <div className="mb-3">
          <label className="form-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="form-control"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              console.log("[Login] Username changed:", e.target.value);
            }}
            required
            autoFocus
          />
        </div>
        <div className="mb-3 position-relative">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className="form-control"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              console.log(
                "[Login] Password changed:",
                e.target.value ? "***" : ""
              );
            }}
            required
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="btn btn-outline-secondary position-absolute top-50 end-0 translate-middle-y me-2"
            style={{ zIndex: 10 }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
