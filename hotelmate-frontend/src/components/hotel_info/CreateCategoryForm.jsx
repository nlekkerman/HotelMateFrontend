import React, { useState } from "react";
import api from "@/services/api";
import HotelInfoModal from "@/components/modals/HotelInfoModal"; // Use your modal component

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-\-+/g, "-");
}

export default function CreateCategoryForm({ hotelSlug, onSuccess, onClose }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // For QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [createdCategorySlug, setCreatedCategorySlug] = useState(null);
  const [creatingQr, setCreatingQr] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setShowQrModal(false);
    setCreatedCategorySlug(null);
    setQrUrl(null);
    setQrError(null);

    const slug = slugify(name);
    try {
      const res = await api.post("/hotel_info/categories/", {
        name,
        slug,
        hotel_slug: hotelSlug,
      });
      setName("");
      // Show QR modal and block everything
      setCreatedCategorySlug(res.data.slug);
      setShowQrModal(true);
    } catch (err) {
      if (err.response && err.response.data) {
        setError(
          typeof err.response.data === "string"
            ? err.response.data
            : JSON.stringify(err.response.data)
        );
      } else {
        setError("Could not create category.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Generate QR for this category (must use slug!)
  const handleGenerateQr = async () => {
    setCreatingQr(true);
    setQrError(null);
    try {
      const res = await api.post("/hotel_info/category_qr/", {
        hotel_slug: hotelSlug,
        category_slug: createdCategorySlug,
      });
      setQrUrl(res.data.qr_url);
      // Wait a sec, then finish!
      setTimeout(() => {
        setShowQrModal(false);
        onSuccess && onSuccess(createdCategorySlug);
        onClose && onClose();
      }, 1200);
    } catch (err) {
      setQrError("Failed to generate QR code.");
    } finally {
      setCreatingQr(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="mb-2">
          <label className="form-label">Category Name</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={saving || showQrModal}
          />
          {name && (
            <div className="form-text text-muted">
              Slug: <code>{slugify(name)}</code>
            </div>
          )}
        </div>
        {error && <div className="text-danger mb-2">{error}</div>}
        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={saving || showQrModal}>
            {saving ? "Creating..." : "Create Category"}
          </button>
          {onClose && (
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving || showQrModal}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {showQrModal && (
        <HotelInfoModal>
          <div className="p-4 text-center">
            <h5 className="mb-3">Generate QR for this Category</h5>
            {!qrUrl ? (
              <>
                <button
                  className="btn btn-dark"
                  onClick={handleGenerateQr}
                  disabled={creatingQr}
                >
                  {creatingQr ? "Generating QR..." : "Generate QR"}
                </button>
                {qrError && <div className="text-danger mt-2">{qrError}</div>}
              </>
            ) : (
              <>
                <div className="mb-3">
                  <img
                    src={qrUrl}
                    alt="QR code"
                    className="img-fluid img-thumbnail"
                    style={{ maxWidth: 200 }}
                  />
                </div>
                <div className="alert alert-success">
                  Category and QR code created!
                </div>
              </>
            )}
          </div>
        </HotelInfoModal>
      )}
    </>
  );
}
