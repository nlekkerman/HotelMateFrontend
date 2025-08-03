// src/components/home/Post.jsx
import React, { useState } from "react";
import api from "@/services/api";
import CommentsSection from "@/components/home/CommentsSection";
import DeletionModal from "@/components/modals/DeletionModal";
import { useAuth } from "@/context/AuthContext";
import { FaUserCircle } from "react-icons/fa";
import ImageModal from "@/components/modals/ImageModal";

const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || "";

function buildImageUrl(img) {
  if (!img || typeof img !== "string") return null;
  if (img.startsWith("data:")) return img;
  if (/^https?:\/\//i.test(img)) return img;
  return cloudinaryBase ? `${cloudinaryBase}${img}` : img;
}

export default function Post({ post, onPostUpdated }) {
  const { user } = useAuth();

  const author = post.author_details || {};
  const authorAvatar =
    buildImageUrl(author.profile_image_url || author.profile_image) ||
    null; // final fallback is null so we show the FaUserCircle

  const isAuthor = Boolean(post.is_author);

  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contentInput, setContentInput] = useState(post.content ?? "");
  const [imageFile, setImageFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.is_liked || false);
  const [showImageModal, setShowImageModal] = useState(false);
  const safeImg = buildImageUrl(post.image);

  const handleLike = async (e) => {
    e.preventDefault();
    if (isLiking) return;
    setIsLiking(true);
    try {
      const { data } = await api.post(
        `/home/${post.hotel_slug}/posts/${post.id}/like/`
      );
      setLikeCount(data.like_count ?? likeCount + 1);
      setLiked((v) => !v);
    } catch (err) {
      console.error("Failed to like post", err);
    } finally {
      setIsLiking(false);
    }
  };

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
      onPostUpdated?.();
    } catch (err) {
      console.error("Failed to update post", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/home/${post.hotel_slug}/posts/${post.id}/`);
      setShowDeleteModal(false);
      onPostUpdated?.();
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  };

  return (
    <>
      <DeletionModal
        show={showDeleteModal}
        title="Delete Post"
        body="Are you sure you want to delete this post?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />

      <div className="shadow-sm p-2 mb-4">
        <div className="card-body p-4 bg-light mb-2">
          <div className="d-flex justify-content-between align-items-center mb-3">
            {/* LEFT: avatar + name */}
            <div className="d-flex align-items-center">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt="avatar"
                  className="rounded-circle me-3"
                  style={{ width: 40, height: 40, objectFit: "cover" }}
                />
              ) : (
                <FaUserCircle
                  className="me-3 text-secondary"
                  style={{ fontSize: 40 }}
                />
              )}
              <div>
                <div className="fw-bold text-capitalize">
                  {author.first_name} {author.last_name}
                </div>
              </div>
            </div>

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
                className="form-control mb-3"
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
              {safeImg && (
  <div className="text-center mb-3">
    <img
      src={safeImg}
      alt="Post"
      className="img-fluid rounded mx-auto d-block"
      style={{ maxHeight: "400px", objectFit: "contain", cursor: "zoom-in" }}
      onClick={() => setShowImageModal(true)}
    />
  </div>
)}

            </>
          )}

          <div className="date-time-container d-flex justify-content-end mb-2">
          <small className="text-muted small">
              {new Date(post.created_at).toLocaleString()}
            </small>
          </div>

          <div className="d-flex justify-content-around shadow-sm p-1 mt-4 mb13">
            <button
              type="button"
              className={`like-share-comment-button ${
                liked ? "btn-danger" : "btn-outline-danger"
              }`}
              onClick={handleLike}
              disabled={isLiking}
            >
              ❤️ {liked ? "Liked" : "Like"} ({likeCount})
            </button>

            <button
              type="button"
              className="like-share-comment-button"
              onClick={() => setShowComments((prev) => !prev)}
            >
              💬 Comment ({post.comment_count ?? 0})
            </button>

            <button
              type="button"
              className="like-share-comment-button"
              onClick={() =>
                navigator.share?.({
                  title: "Hotel Post",
                  url: window.location.href,
                })
              }
            >
              🔗 Share
            </button>
          </div>
        </div>

        {showComments && (
          <CommentsSection
            postId={post.id}
            hotelSlug={post.hotel_slug}
            initialComments={post.comments || []}
            initialCount={post.comment_count || 0}
          />
        )}
      </div>
      {showImageModal && (
  <ImageModal
    src={safeImg}
    alt="Post Image"
    onClose={() => setShowImageModal(false)}
  />
)}

    </>
  );
}
