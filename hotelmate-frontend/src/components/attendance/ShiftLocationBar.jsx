import React, { useState, useEffect } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import {
  getShiftLocations,
  createShiftLocation,
  updateShiftLocation,
  deleteShiftLocation,
} from "@/services/shiftLocations";

export default function ShiftLocationBar({ hotelSlug: propHotelSlug, onChange }) {
  const [hotelSlug, setHotelSlug] = useState(
    propHotelSlug || JSON.parse(localStorage.getItem("user") || "{}")?.hotel_slug
  );
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", color: "#0d6efd" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const normalizeColor = (color) => {
    if (!color) return "#0d6efd";
    return color.startsWith("#") ? color : `#${color}`;
  };

  const load = async () => {
    if (!hotelSlug) return;
    try {
      const data = await getShiftLocations(hotelSlug);
      const list = Array.isArray(data) ? data : data.results || [];
      setLocations(list);
      if (list.length && !selected) {
        setSelected(list[0]);
        onChange?.(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!hotelSlug) {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setHotelSlug(userData.hotel_slug || userData.hotel?.slug || null);
    }
  }, []);

  useEffect(() => {
    if (hotelSlug) load();
  }, [hotelSlug]);

  return (
    <div className="mb-3">
      <Dropdown>
        <Dropdown.Toggle
          variant="light"
          className="rounded-pill px-4 py-2"
          style={{
            backgroundColor: selected ? normalizeColor(selected.color) : "#0d6efd",
            color: "#fff",
            border: "none",
          }}
        >
          {selected ? selected.name : "Select location"}
        </Dropdown.Toggle>

        <Dropdown.Menu className="p-2">
          {locations.map((loc) => (
            <Dropdown.Item
              key={loc.id}
              onClick={() => {
                setSelected(loc);
                onChange?.(loc);
              }}
              style={{
                backgroundColor: normalizeColor(loc.color),
                color: "#fff",
                borderRadius: "50px",
                marginBottom: "5px",
                padding: "6px 12px",
              }}
            >
              {loc.name}
            </Dropdown.Item>
          ))}
          <Dropdown.Divider />
          <Dropdown.Item
            onClick={() => {
              setEditing(null);
              setForm({ name: "", color: "#0d6efd" });
              setError(null);
              setShowModal(true);
            }}
            className="text-primary fw-bold"
          >
            + Create new location
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
