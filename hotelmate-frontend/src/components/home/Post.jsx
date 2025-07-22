// src/components/home/Post.jsx

import React, { useState } from "react";
import api from "@/services/api";
import CommentsSection from "@/components/home/CommentsSection";
import DeletionModal from "@/components/modals/DeletionModal";
import { useAuth } from "@/context/AuthContext";
import { FaUserCircle } from "react-icons/fa";
const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE;

export default function Post({ post, onPostUpdated }) {
  const { user } = useAuth();
  // Use the server‐provided flag
  const isAuthor = Boolean(post.is_author);
  const avatarUrl = user?.profile_image_url;
  // ——— Like state ———
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLiking, setIsLiking] = useState(false);

  // ——— Edit/Delete UI state ———
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ——— Edit form state ———
  const [contentInput, setContentInput] = useState(post.content);
  const [imageFile, setImageFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Like toggle
  const handleLike = async (e) => {
    e.preventDefault();
    if (isLiking) return;
    setIsLiking(true);
    try {
      const { data } = await api.post(
        `/home/${post.hotel_slug}/posts/${post.id}/like/`
      );
      setLikeCount(data.like_count ?? likeCount + 1);
    } catch (err) {
      console.error("Failed to like post", err);
    } finally {
      setIsLiking(false);
    }
  };

  // Submit edits
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!contentInput.trim() && !imageFile) return;
    const form = new FormData();
    form.append("content", contentInput);
    if (imageFile) form.append("image", imageFile);

    setIsUpdating(true);
    try {
      await api.patch(`/home/${post.hotel_slug}/posts/${post.id}/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditing(false);
      onPostUpdated();
    } catch (err) {
      console.error("Failed to update post", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm and perform delete
  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/home/${post.hotel_slug}/posts/${post.id}/`);
      setShowDeleteModal(false);
      onPostUpdated();
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  };

  return (
    <>
      {/* Delete confirmation modal */}
      <DeletionModal
        show={showDeleteModal}
        title="Delete Post"
        body="Are you sure you want to delete this post?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />

      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            {/* LEFT: avatar + name + date */}
            <div className="d-flex align-items-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="rounded-circle me-2"
                  style={{ width: 32, height: 32, objectFit: "cover" }}
                />
              ) : (
                <FaUserCircle
                  className="me-2 text-secondary"
                  style={{ fontSize: 32 }}
                />
              )}
              <div>
                <div className="fw-bold">
                  {post.author_details.first_name}{" "}
                  {post.author_details.last_name}
                </div>
                <small className="text-muted">
                  {new Date(post.created_at).toLocaleString()}
                </small>
              </div>
            </div>

            {/* RIGHT: edit/delete buttons */}
            {isAuthor && (
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setEditing(true)}
                  title="Edit Post"
                >
                  <i className="bi bi-pencil-fill"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setShowDeleteModal(true)}
                  title="Delete Post"
                >
                  <i className="bi bi-trash-fill"></i>
                </button>
              </div>
            )}
          </div>

          {/* Edit form or content */}
          {editing ? (
            <form onSubmit={handleUpdate} className="mb-3">
              <textarea
                className="form-control mb-2"
                rows={3}
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                className="form-control mb-2"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
              <button
                type="submit"
                className="btn btn-sm btn-primary me-2"
                disabled={isUpdating}
              >
                {isUpdating ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setEditing(false)}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <p className="card-text">{post.content}</p>
              {post.image && (
                <img
                  src={
                    post.image.startsWith("http")
                      ? post.image
                      : `${cloudinaryBase}${post.image}`
                  }
                  alt="Post"
                  className="img-fluid rounded mb-3"
                  style={{ maxHeight: "400px", objectFit: "contain" }}
                />
              )}
            </>
          )}

          {/* Likes & comment count */}
          <div className="d-flex align-items-center text-muted">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger me-2"
              onClick={handleLike}
              disabled={isLiking}
            >
              ❤️ Like
            </button>
            {likeCount} · 💬 {post.comment_count}
          </div>
        </div>

        {/* Comments section */}
        <CommentsSection
          postId={post.id}
          hotelSlug={post.hotel_slug}
          initialComments={post.comments || []}
          initialCount={post.comment_count || 0}
        />
      </div>
    </>
  );
}
