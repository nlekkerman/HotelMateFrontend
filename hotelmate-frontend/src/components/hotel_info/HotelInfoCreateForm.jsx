import React, { useState, useEffect } from "react";
import api from "@/services/api";

export default function HotelInfoCreateForm({ hotelSlug, onSuccess, onClose }) {
  const [categories, setCategories] = useState([]);
  const [categorySlug, setCategorySlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
   const [endTime, setEndTime] = useState("");
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotelSlug) return;
    api
      .get("/hotel_info/categories/", {
        
      })
      .then(res => {
        setCategories(res.data.results || []);
      })
      .catch(() => {
        setCategories([]);
      });
  }, [hotelSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Get the name of the selected category
    const selectedCategory = categories.find(cat => cat.slug === categorySlug);
    const categoryName = selectedCategory ? selectedCategory.name : "";

    try {
      const formData = new FormData();
      formData.append("hotel_slug", hotelSlug);
      formData.append("category_name", categoryName);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("event_date", eventDate);
      formData.append("event_time", eventTime);
      formData.append("end_time", endTime); 
      if (image) formData.append("image", image);

      const res = await api.post("/hotel_info/hotelinfo/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Use the slug for navigation or API calls
      onSuccess && onSuccess(categorySlug);
      onClose && onClose();
    } catch (err) {
      setError("Could not create hotel info.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 m-5">
      <div className="mb-2">
        <label className="form-label">Category</label>
        <select
          className="form-select"
          value={categorySlug}
          onChange={e => setCategorySlug(e.target.value)}
          required
        >
          <option value="">Select category…</option>
          {categories.map(cat => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      {/* ...rest is unchanged... */}
      <div className="mb-2">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-control"
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
          rows={3}
        />
      </div>
      <div className="mb-2">
        <label className="form-label">Event Date</label>
        <input
          type="date"
          className="form-control"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <label className="form-label">Event Time</label>
        <input
          type="time"
          className="form-control"
          value={eventTime}
          onChange={(e) => setEventTime(e.target.value)}
        />
      </div>
      <div className="mb-2">                         {/* <-- New input for end_time */}
        <label className="form-label">End Time</label>
        <input
          type="time"
          className="form-control"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <label className="form-label">Image</label>
        <input
          type="file"
          className="form-control"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
      </div>
      {error && <div className="text-danger mb-2">{error}</div>}
      <div className="d-flex justify-content-center  gap-2">
        <button className="btn btn-primary mt-3" type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Info"}
        </button>
        {onClose && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
