import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";

export default function HotelInfoEditModal({
  initialData,
  hotelSlug,
  onSuccess,
  onClose,
}) {
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [eventDate, setEventDate] = useState(initialData?.event_date || "");
  const [eventTime, setEventTime] = useState(initialData?.event_time || "");
  const [endTime, setEndTime] = useState(initialData?.end_time || "");
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
const CLOUD_BASE = import.meta.env.VITE_CLOUDINARY_BASE;
  // To avoid resetting categoryName after user changes it
  const initialized = useRef(false);

  // Fetch categories when hotelSlug changes
  useEffect(() => {
    if (!hotelSlug) return;
    api
      .get("/hotel_info/categories/")
      .then((res) => {
        setCategories(res.data.results || []);
      })
      .catch(() => setCategories([]));
  }, [hotelSlug]);

  // Set categoryName from initialData.category after categories are loaded
useEffect(() => {
    if (!initialized.current && initialData?.category) {
      api
        .get(`/hotel_info/categories/${initialData.category}/`)  // Assuming your API supports this endpoint
        .then((res) => {
          const categoryDetail = res.data;
          // categoryDetail should have at least slug and name
          console.log("Fetched category detail:", categoryDetail);

          // Now check if categoryDetail.slug matches any of the categories loaded
          const matchedCategory = categories.find(
            (cat) => cat.slug === categoryDetail.slug
          );

          if (matchedCategory) {
            setCategoryName(matchedCategory.name);
          } else {
            // Fallback: just use fetched category name (even if not in categories list)
            setCategoryName(categoryDetail.name);
          }

          initialized.current = true;
        })
        .catch((err) => {
          console.error("Failed to fetch category detail by ID:", err);
        });
    }
  }, [initialData, categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("category_name", categoryName);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("event_date", eventDate);
      formData.append("event_time", eventTime);
      formData.append("end_time", endTime);
      if (image) formData.append("image", image);

      await api.put(`/hotel_info/hotelinfo/${initialData.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onSuccess && onSuccess(categoryName);
      onClose && onClose();
    } catch (err) {
      console.error("Error updating hotel info:", err);
      setError("Could not update hotel info.");
    } finally {
      setSaving(false);
    }
  };
const getFullImageUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${CLOUD_BASE}${path}`;
};
  return (
    <form onSubmit={handleSubmit} className="mb-3 m-5">
      <div className="mb-2">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          required
        >
          <option value="">Select category…</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
         {/* Display existing image */}
   
      </div>

      <div className="mb-2">
        <label className="form-label">Title</label>
        <input
          className="form-control"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="mb-2">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="mb-2">
        <label className="form-label">Event Date</label>
        <input
          className="form-control"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="form-label">Event Time</label>
        <input
          className="form-control"
          type="time"
          value={eventTime}
          onChange={(e) => setEventTime(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="form-label">End Time</label>
        <input
          className="form-control"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="form-label">Image</label>
        <input
          className="form-control"
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
      </div>
{!image && initialData?.image && (
    <div className="mt-2">
      <p className="mb-1">Current Image:</p>
      <img
        src={getFullImageUrl(initialData.image)}
        alt="Current"
        style={{ maxWidth: "100%", maxHeight: "100px", borderRadius: "4px" }}
        className="m-3"
      />
    </div>
  )}
      {error && <div className="alert alert-danger">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
      <button
        className="btn btn-secondary ms-2"
        type="button"
        onClick={onClose}
        disabled={saving}
      >
        Cancel
      </button>
    </form>
  );
}
