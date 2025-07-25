// src/components/home/CommentItem.jsx
import React, { useState } from "react";
import api from "@/services/api";
import CommentComposer from "@/components/home/CommentComposer";
import DeletionModal from "@/components/modals/DeletionModal";
import { useAuth } from "@/context/AuthContext";
import { FaUserCircle } from "react-icons/fa";

const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || "";

function buildImageUrl(img) {
  if (!img || typeof img !== "string") return null;
  if (img.startsWith("data:")) return img;
  if (/^https?:\/\//i.test(img)) return img;
  return cloudinaryBase ? `${cloudinaryBase}${img}` : img;
}

export default function CommentItem({
  comment,
  postId,
  hotelSlug,
  onUpdate,
  onDelete,
  onReplyAdded,
}) {
  const { user } = useAuth(); // keep if you want to restrict edit/delete to the comment owner

  const [replies, setReplies] = useState(comment.replies || []);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const author = comment.author_details || {};
  const avatarUrl =
    buildImageUrl(author.profile_image_url || author.profile_image) || null;

  const isMyComment =
    user && (author.user_id ? user.id === author.user_id : false);

  const confirmDelete = async () => {
    try {
      await api.delete(
        `home/${hotelSlug}/posts/${postId}/comments/${comment.id}/`
      );
      setShowDelete(false);
      onDelete(comment.id);
    } catch (e) {
      console.error("Failed to delete comment", e);
    }
  };

  const handleReply = (newReply) => {
    setReplies((prev) => [...prev, newReply]);
    onReplyAdded?.(newReply);
    setShowReplyForm(false);
  };

  const handleUpdate = (updated) => {
    onUpdate(updated);
    setEditing(false);
  };

  return (
    <>
      {/* Deletion confirmation */}
      <DeletionModal
        show={showDelete}
        title="Delete Comment"
        body="Are you sure you want to delete this comment?"
        onConfirm={confirmDelete}
        onCancel={() => setShowDelete(false)}
      />

      <div className="shadow-sm mb-3">
        <div className="card-body">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-2">
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
                <strong>
                  {author.first_name} {author.last_name}
                </strong>
                <small className="text-muted ms-2">
                  • {new Date(comment.created_at).toLocaleString()}
                </small>
              </div>
            </div>

            <div className="btn-group btn-group-sm" role="group">
              {/* Reply toggle */}
              <button
                type="button"
                className="btn"
                title="Reply"
                onClick={() => setShowReplyForm((v) => !v)}
              >
                <i className="bi bi-reply-fill"></i>
              </button>

              {/* Edit (optionally show only if owner) */}
              <button
                type="button"
                className="btn"
                title="Edit"
                onClick={() => setEditing(true)}
                disabled={false /* or !isMyComment if you want to lock it */}
              >
                <i className="bi bi-pencil-fill"></i>
              </button>

              {/* Delete (optionally show only if owner) */}
              <button
                type="button"
                className="btn text-danger"
                title="Delete"
                onClick={() => setShowDelete(true)}
                disabled={false /* or !isMyComment */}
              >
                <i className="bi bi-trash-fill"></i>
              </button>
            </div>
          </div>

          {/* Content or edit form */}
          {editing ? (
          <CommentComposer
              postId={postId}
              hotelSlug={hotelSlug}
              comment={comment}
              onCommentUpdated={handleUpdate}
            />
          ) : (
            <>
              <p className="mb-2">{comment.content}</p>
              {comment.image && (
                <img
                  src={buildImageUrl(comment.image)}
                  alt="Comment"
                  className="img-fluid rounded mb-2"
                  style={{ maxHeight: "200px", objectFit: "contain" }}
                />
              )}
            </>
          )}

          {/* Reply controls (stacked vertically) */}
          <div className="d-flex flex-column mb-2">
            <button
              type="button"
              className="btn btn-link btn-sm p-0 mb-1"
              onClick={() => setShowReplies((v) => !v)}
            >
              {showReplies
                ? "Hide replies"
                : `View replies (${replies.length})`}
            </button>

            {showReplyForm && (
              <div className="ms-4">
                <CommentComposer
                  postId={postId}
                  hotelSlug={hotelSlug}
                  commentId={comment.id}
                  onCommentAdded={handleReply}
                />
              </div>
            )}
          </div>

          {/* Replies list */}
          {showReplies &&
            replies.map((reply) => {
              const rAuthor = reply.author_details || {};
              const rAvatar =
                buildImageUrl(
                  rAuthor.profile_image_url || rAuthor.profile_image
                ) || null;

              return (
                <div key={reply.id} className="ms-4 ps-3 border-start mt-2">
                  <div className="d-flex align-items-center">
                    {rAvatar ? (
                      <img
                        src={rAvatar}
                        alt="avatar"
                        className="rounded-circle me-2"
                        style={{ width: 28, height: 28, objectFit: "cover" }}
                      />
                    ) : (
                      <FaUserCircle
                        className="me-2 text-secondary"
                        style={{ fontSize: 28 }}
                      />
                    )}
                    <strong>
                      {rAuthor.first_name} {rAuthor.last_name}
                    </strong>
                    <small className="text-muted ms-2">
                      • {new Date(reply.created_at).toLocaleString()}
                    </small>
                  </div>

                  <p className="mb-1">{reply.content}</p>
                  {reply.image && (
                    <img
                      src={buildImageUrl(reply.image)}
                      alt="Reply"
                      className="img-fluid rounded mb-2"
                      style={{ maxHeight: "150px", objectFit: "contain" }}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
