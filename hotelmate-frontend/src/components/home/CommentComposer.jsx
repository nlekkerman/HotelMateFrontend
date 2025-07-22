// src/components/home/CommentComposer.jsx

import React, { useState, useEffect } from "react";
import api from "@/services/api";

export default function CommentComposer({
  postId,
  hotelSlug,
  parentId, // for replies
  comment, // if present, we’re editing
  onCommentAdded, // new comment or reply
  onCommentUpdated, // editing existing comment
}) {
  const [content, setContent] = useState(comment?.content || "");
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // when comment prop changes (i.e. start editing), prefill content
  useEffect(() => {
    if (comment) {
      setContent(comment.content);
      // we won’t prefill image; user must re-upload if needed
    }
  }, [comment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    const formData = new FormData();
    formData.append("content", content);
    if (image) formData.append("image", image);
    if (parentId) formData.append("parent", parentId);

    setSubmitting(true);
    try {
      let res;
      if (comment) {
        // —— EDIT existing comment ——
        res = await api.patch(
          `/home/${hotelSlug}/posts/${postId}/comments/${comment.id}/`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        onCommentUpdated?.(res.data);
      } else {
        // —— NEW comment or reply ——
        res = await api.post(
          `/home/${hotelSlug}/posts/${postId}/comments/`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        onCommentAdded?.(res.data);
      }

      // reset composer
      setContent("");
      setImage(null);
    } catch (err) {
      console.error("Failed to save comment", err.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        className="form-control mb-1"
        rows={2}
        placeholder={
          comment
            ? "Edit your comment…"
            : parentId
            ? "Write a reply…"
            : "Write a comment…"
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="mb-2 d-flex align-items-center">
        <input
          id="comment-image"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => setImage(e.target.files[0])}
        />
        <label
          htmlFor="comment-image"
          className=" btn-outline-secondary btn-sm p-1"
        >
          <i className="bi bi-image" style={{ fontSize: "1.2rem" }}></i>
        </label>

        {/* Show filename if image is selected */}
        {image && (
          <small className="ms-2 text-muted">
            <i className="bi bi-check-circle text-success me-1"></i>
            {image.name}
          </small>
        )}
      </div>

        <div className="d-flex justify-content-center">
      <button
        type="submit"
        className="btn btn-sm custom-button"
        disabled={submitting}
      >
        {submitting
          ? comment
            ? "Updating…"
            : "Posting…"
          : comment
          ? "Update"
          : "Comment"}
      </button>
      </div>
    </form>
  );
}
