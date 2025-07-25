// src/components/home/PostComposer.jsx
import React, { useState } from "react";
import api from "@/services/api";

const MAX_IMAGE_MB = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function PostComposer({ hotelSlug, onPostCreated }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setContent("");
    setImage(null);
    setPreview(null);
    setError(null);
  };

  const handleFile = (file) => {
    if (!file) {
      setImage(null);
      setPreview(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Unsupported image type. Use JPG/PNG/WEBP/GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image too large. Max ${MAX_IMAGE_MB}MB.`);
      return;
    }
    setError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    const formData = new FormData();
    formData.append("content", content);
    if (image) formData.append("image", image);

    setSubmitting(true);
    setError(null);

    try {
      await api.post(`home/${hotelSlug}/posts/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // SAFEST: re-fetch in parent so shape is consistent
      onPostCreated?.();

      resetForm();
    } catch (err) {
      console.error("Failed to post:", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Failed to create post."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-3 shadow-sm mb-3">
      <textarea
        className="form-control border-0"
        placeholder="Share your thoughts..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        style={{ resize: "none", fontSize: "0.95rem" }}
      />

      {preview && (
        <div className="mt-2 text-center">
          <img
          src={preview}
          alt="preview"
          className="img-fluid rounded"
          style={{ maxHeight: 240, objectFit: "contain" }}
          />
        </div>
      )}

      {error && (
        <div className="text-danger small mt-2">
          {error}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mt-2">
        <div>
          <label htmlFor="post-image" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-image"></i>
          </label>
          <input
            id="post-image"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {image && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-2"
              onClick={() => handleFile(null)}
            >
              Remove
            </button>
          )}
        </div>

        {(content.trim() || image) && (
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={submitting}
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        )}
      </div>
    </form>
  );
}
