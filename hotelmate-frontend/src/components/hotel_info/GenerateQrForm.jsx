import React, { useState } from "react";
import api from "@/services/api";
import { useCan } from "@/rbac";

export default function GenerateQrForm({ hotelSlug, categories, onGenerated, onClose }) {
  // Backend-driven RBAC: action authority comes from
  // `user.rbac.hotel_info.actions.qr_generate`. Fail-closed for missing perms.
  const { can } = useCan();
  const canQrGenerate = can("hotel_info", "qr_generate");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!canQrGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/hotel_info/category_qr/", {
        hotel_slug: hotelSlug,
        category_slug: selectedCategory,
      });
      onGenerated && onGenerated(res.data.qr_url);
      onClose && onClose();
    } catch (err) {
      setError("Could not generate QR code.");
    } finally {
      setLoading(false);
    }
  };

  if (!canQrGenerate) return null;

  return (
    <form onSubmit={handleGenerate} className="mb-3">
      <div className="mb-2">
        <label className="form-label">Select Category</label>
        <select
          className="form-select"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          required
        >
          <option value="" disabled>Select...</option>
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      {error && <div className="text-danger mb-2">{error}</div>}
      <div className="d-flex gap-2">
        <button className="btn btn-outline-dark" type="submit" disabled={loading || !canQrGenerate}>
          {loading ? "Generating..." : "Generate QR"}
        </button>
        {onClose && (
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
