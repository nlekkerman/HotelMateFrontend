// Debug component to check Pusher connection and staff status
// Add this temporarily to your page to see what's happening

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";
import api from "@/services/api";

export default function PusherDebugger() {
  const { user } = useAuth();
  const { hasNewRoomService, hasNewBreakfast, staffData } = useRoomServiceNotifications();
  const [envCheck, setEnvCheck] = useState({});
  const [localStorageData, setLocalStorageData] = useState({});

  useEffect(() => {
    setEnvCheck({
      pusherKey: import.meta.env.VITE_PUSHER_KEY,
      pusherCluster: import.meta.env.VITE_PUSHER_CLUSTER,
      apiUrl: import.meta.env.VITE_API_URL,
    });

    // Check localStorage
    try {
      const storedUser = localStorage.getItem("user");
      const userData = storedUser ? JSON.parse(storedUser) : null;
      setLocalStorageData(userData);
      console.log("📦 LocalStorage user data:", userData);
    } catch (err) {
      console.error("Failed to parse localStorage:", err);
    }
  }, []);

  const testConnection = async () => {
    try {
      const res = await api.get("/staff/me/");
      console.log("✅ Staff Profile Response:", res.data);
      
      // Check if it's paginated
      if (res.data.results && Array.isArray(res.data.results)) {
        if (res.data.results.length === 0) {
          alert("⚠️ No staff profile found!\n\nYou might be:\n1. Logged in as a guest (not staff)\n2. Not have a staff profile\n3. Using wrong endpoint");
        } else {
          const staff = res.data.results[0];
          alert(`✅ Staff: ${staff.first_name} ${staff.last_name}\nOn Duty: ${staff.is_on_duty}\nDept: ${staff.department?.slug || 'None'}\nRole: ${staff.role?.slug || 'None'}`);
        }
      } else {
        alert(`✅ Staff: ${res.data.first_name}\nOn Duty: ${res.data.is_on_duty}\nDept: ${res.data.department?.slug}\nRole: ${res.data.role?.slug}`);
      }
    } catch (err) {
      console.error("❌ Failed to fetch staff:", err);
      alert(`❌ Failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "white",
      border: "2px solid #333",
      borderRadius: "8px",
      padding: "15px",
      zIndex: 9999,
      maxWidth: "400px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      fontSize: "12px"
    }}>
      <h4 style={{ margin: "0 0 10px 0" }}>🐛 Pusher Debugger</h4>
      
      <div style={{ marginBottom: "10px" }}>
        <strong>Environment:</strong><br/>
        Pusher Key: {envCheck.pusherKey ? "✅ Set" : "❌ Missing"}<br/>
        Pusher Cluster: {envCheck.pusherCluster || "❌ Missing"}<br/>
        API URL: {envCheck.apiUrl || "❌ Missing"}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>User (from context):</strong><br/>
        Logged In: {user ? "✅ Yes" : "❌ No"}<br/>
        Hotel: {user?.hotel_slug || "N/A"}<br/>
        ID: {user?.id || "N/A"}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>LocalStorage Data:</strong><br/>
        Token: {localStorageData?.token ? "✅ Present" : "❌ Missing"}<br/>
        User Type: {localStorageData?.is_staff ? "Staff" : localStorageData?.is_guest ? "Guest" : "Unknown"}<br/>
        Email: {localStorageData?.email || "N/A"}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Staff Data (from API):</strong><br/>
        Loaded: {staffData ? "✅ Yes" : "❌ No"}<br/>
        On Duty: {staffData?.is_on_duty ? "✅ Yes" : "❌ No"}<br/>
        Department: {staffData?.department?.slug || "N/A"}<br/>
        Role: {staffData?.role?.slug || "N/A"}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Notifications:</strong><br/>
        Room Service: {hasNewRoomService ? "🔴 NEW" : "⚪ None"}<br/>
        Breakfast: {hasNewBreakfast ? "🔴 NEW" : "⚪ None"}
      </div>

      <button 
        onClick={testConnection}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "4px",
          cursor: "pointer",
          width: "100%",
          marginBottom: "5px"
        }}
      >
        Test Staff Profile API
      </button>

      <div style={{ fontSize: "10px", marginTop: "10px", color: "#666" }}>
        Check browser console (F12) for detailed logs
      </div>
    </div>
  );
}
