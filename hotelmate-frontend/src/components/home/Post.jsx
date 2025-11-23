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
        `/staff/hotels/${post.hotel_slug}/home/posts/${post.id}/like/`
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
      await api.patch(`/staff/hotels/${post.hotel_slug}/home/posts/${post.id}/`, form, {
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
      await api.delete(`/staff/hotels/${post.hotel_slug}/home/posts/${post.id}/`);
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

      <div className="post-card">
        <div className="post-card-header">
          <div className="post-author">
            <div className="post-author-avatar">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt="avatar"
                  className="post-author-avatar-img"
                />
              ) : (
                <FaUserCircle
                  className="post-author-avatar-img"
                  style={{ fontSize: 40, color: '#999' }}
                />
              )}
            </div>
            <div className="post-author-info">
              <div className="post-author-name">
                {author.first_name} {author.last_name}
              </div>
              <div className="post-timestamp">
                {new Date(post.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          {isAuthor && (
            <div className="post-actions-menu">
              <button
                type="button"
                className="post-action-icon-btn"
                onClick={() => setEditing(true)}
                title="Edit Post"
              >
                <i className="bi bi-pencil-fill"></i>
              </button>
              <button
                type="button"
                className="post-action-icon-btn danger"
                onClick={() => setShowDeleteModal(true)}
                title="Delete Post"
              >
                <i className="bi bi-trash-fill"></i>
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleUpdate} className="post-edit-form">
            <textarea
              className="post-edit-textarea"
              rows={3}
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              className="form-control mb-3 mt-2"
              onChange={(e) => setImageFile(e.target.files[0])}
            />
            <div className="post-edit-actions">
              <button
                type="submit"
                className="post-edit-btn primary"
                disabled={isUpdating}
              >
                {isUpdating ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="post-edit-btn secondary"
                onClick={() => setEditing(false)}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="post-content">
              <p className="post-text">{post.content}</p>
            </div>
            
            {safeImg && (
              <div className="post-image-container" onClick={() => setShowImageModal(true)}>
                <img
                  src={safeImg}
                  alt="Post"
                  className="post-image"
                />
              </div>
            )}
          </>
        )}

        <div className="post-interactions">
          <button
            type="button"
            className={`interaction-btn like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={isLiking}
          >
           
            <span>{liked ? "Liked" : "Like"}</span>
            <span className="btn-count">{likeCount}</span>
          </button>

          <button
            type="button"
            className="interaction-btn comment-btn"
            onClick={() => setShowComments((prev) => !prev)}
          >
            <span className="btn-icon">💬</span>
            <span>Comment</span>
            <span className="btn-count">{post.comment_count ?? 0}</span>
          </button>

          <button
            type="button"
            className="interaction-btn share-btn"
            onClick={() =>
              navigator.share?.({
                title: "Hotel Post",
                url: window.location.href,
              })
            }
          >
            <span className="btn-icon">🔗</span>
            <span>Share</span>
          </button>
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
