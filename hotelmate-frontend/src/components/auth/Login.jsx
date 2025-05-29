import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useLogin from "@/hooks/useLogin";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { loginUser, loading, error } = useLogin();
  const [localError, setLocalError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!username || !password) {
      setLocalError("Username and password are required.");
      return;
    }

    try {
      const data = await loginUser(username, password);

      // Defensive check
      if (!data) {
        setLocalError("No data received from server.");
        return;
      }

      navigate("/reception");
    } catch {
      // error is already handled in the hook, no need to re-handle here
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="container mt-4">
      <h2>Login</h2>

      {localError && (
        <div className="alert alert-danger">
          {typeof localError === "string" ? localError : JSON.stringify(localError)}
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
            onChange={(e) => setUsername(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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
