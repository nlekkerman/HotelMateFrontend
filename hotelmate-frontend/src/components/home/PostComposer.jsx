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
      await api.post(`/staff/hotels/${hotelSlug}/home/posts/`, formData, {
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
    <form onSubmit={handleSubmit} className="post-composer">
      <textarea
        className="post-composer-textarea"
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />

      {preview && (
        <div className="post-composer-preview">
          <img
            src={preview}
            alt="preview"
            className="post-composer-preview-img"
          />
        </div>
      )}

      {error && (
        <div className="text-danger small mt-2">
          {error}
        </div>
      )}

      <div className="post-composer-actions">
        <div className="post-composer-toolbar">
          <label htmlFor="post-image" className="composer-icon-btn" title="Add image">
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
              className="composer-icon-btn danger"
              onClick={() => handleFile(null)}
              title="Remove image"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>

        {(content.trim() || image) && (
          <button
            type="submit"
            className="composer-post-btn"
            disabled={submitting}
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        )}
      </div>
    </form>
  );
}
