import React, { useState, useEffect } from "react";
import {
  getShiftLocations,
  createShiftLocation,
  updateShiftLocation,
  deleteShiftLocation,
} from "@/services/shiftLocations";

export default function ShiftLocationBar({ hotelSlug: propHotelSlug, onChange }) {
  // Get hotel slug directly from localStorage if not passed as prop
  const [hotelSlug, setHotelSlug] = useState(
    propHotelSlug || JSON.parse(localStorage.getItem("user") || "{}")?.hotel_slug
  );

  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", color: "#0d6efd" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!hotelSlug) {
      console.error("❌ No hotel slug found!");
      return;
    }
    try {
      const data = await getShiftLocations(hotelSlug);
      setLocations(Array.isArray(data) ? data : data.results || []);
      onChange?.(data);
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

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", color: "#0d6efd" });
    setError(null);
    setShowModal(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setForm({ name: loc.name, color: loc.color });
    setError(null);
    setShowModal(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateShiftLocation(hotelSlug, editing.id, form);
      } else {
        await createShiftLocation(hotelSlug, form);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setError("Failed to save location");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!window.confirm("Delete this location?")) return;
    setSaving(true);
    try {
      await deleteShiftLocation(hotelSlug, editing.id);
      setShowModal(false);
      await load();
    } catch (err) {
      setError("Failed to delete location");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Top bar with badges */}
      <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
        {locations.map((loc) => (
          <span
            key={loc.id}
            className="badge rounded-pill"
            style={{
              backgroundColor: loc.color || "#0d6efd",
              cursor: "pointer",
            }}
            title="Edit this location"
            onClick={() => openEdit(loc)}
          >
            {loc.name}
          </span>
        ))}

        <button
          type="button"
          className="btn btn-outline-primary btn-sm ms-2"
          onClick={openCreate}
        >
          + Add location
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal location-modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={onSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editing ? "Edit location" : "Create location"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>

                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Color</label>
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={form.color}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                      title="Choose badge color"
                    />
                  </div>
                </div>

                <div className="modal-footer d-flex justify-content-between">
                  {editing ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger me-auto"
                      onClick={onDelete}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  ) : (
                    <span />
                  )}

                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => setShowModal(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
