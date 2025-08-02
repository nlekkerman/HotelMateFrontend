import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useLogin from "@/hooks/useLogin";
import { getToken, messaging } from "@/firebase";

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

  let fcmToken = null;
  try {
    fcmToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, // ✅ Make sure this env var is set
    });
  } catch (tokenError) {
    console.warn("⚠️ Failed to get FCM token:", tokenError);
  }

  try {
    const data = await loginUser(username, password, fcmToken);
    console.log("Backend response access_level:", data.access_level);
    if (!data) {
      setLocalError("No data received from server.");
      return;
    }
    navigate("/");
  } catch {
    setLocalError("Login failed.");
  }
};



  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="container mt-4 d-flex flex-column align-items-center">
      <h2>Login</h2>

      {localError && (
        <div className="alert alert-danger">
          {typeof localError === "string"
            ? localError
            : JSON.stringify(localError)}
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
            autoComplete="username"
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
            autoComplete="current-password"
          />

          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="btn text-info position-absolute top-50 end-0  "
            style={{ zIndex: 10 }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"} />
          </button>
        </div>
        <div className="text-end">
  <button
    type="button"
    className="btn btn-link px-0 text-decoration-none"
    onClick={() => navigate("/forgot-password")}
    style={{ fontSize: "0.9rem" }}
  >
    Forgot password?
  </button>
</div>

        <div className="d-flex justify-content-center">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
