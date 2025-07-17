import React, { useState } from "react";
import api from "@/services/api";

export default function SubmitMaintenanceRequest({ onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location_note: "",
    status: "open",
    images: [],
  });
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setForm((f) => ({ ...f, images: [...f.images, ...files] }));
    setPreviews((p) => [
      ...p,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { images, ...rest } = form;
      const res = await api.post("/maintenance/requests/", rest);
      const requestId = res.data.id;

      if (images.length) {
        const imgData = new FormData();
        imgData.append("request", requestId);
        images.forEach((file) => imgData.append("images", file));
        await api.post("/maintenance/photos/", imgData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // reset
      setForm({
        title: "",
        description: "",
        location_note: "",
        status: "open",
        images: [],
      });
      setPreviews([]);
      onSuccess(); // tell parent to re-fetch
    } catch (err) {
      console.error("Create error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="row g-2">
        <div className="col-md-5">
          <input
            name="title"
            className="form-control"
            placeholder="Title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>
        <div className="col-md-4">
          <input
            name="location_note"
            className="form-control"
            placeholder="Location (optional)"
            value={form.location_note}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-3">
          <select
            name="status"
            className="form-select"
            value={form.status}
            onChange={handleChange}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="col-12">
          <textarea
            name="description"
            className="form-control"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            rows={2}
          />
        </div>
        <div className="col-md-8">
          <input
            type="file"
            className="form-control"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
        </div>
        <div className="col-md-4 d-grid">
          <button
            type="submit"
            className="btn btn-success"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="mt-3 d-flex flex-wrap">
          {previews.map((src, i) => (
            <img
              key={i}
              src={src}
              alt="preview"
              className="me-2 mb-2 rounded"
              style={{ width: 80, height: 80, objectFit: "cover" }}
            />
          ))}
        </div>
      )}
    </form>
  );
}
        