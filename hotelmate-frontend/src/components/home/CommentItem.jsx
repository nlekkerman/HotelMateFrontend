import React, { useState } from 'react';
import api from '@/services/api';
import CommentComposer from '@/components/home/CommentComposer';
import DeletionModal from '@/components/modals/DeletionModal';
import { useAuth } from "@/context/AuthContext";
import { FaUserCircle } from "react-icons/fa";

const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE;

export default function CommentItem({
  comment,
  postId,
  hotelSlug,
  onUpdate,
  onDelete,
  onReplyAdded,
}) {
  // Local state for replies, editing, deletion modal, reply form
  const [replies, setReplies]         = useState(comment.replies || []);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing]         = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { user } = useAuth();
  const avatarUrl = user?.profile_image_url;

  // Delete confirmation
  const confirmDelete = async () => {
    await api.delete(
      `/home/${hotelSlug}/posts/${postId}/comments/${comment.id}/`
    );
    setShowDelete(false);
    onDelete(comment.id);
  };

  // Add a new reply under this comment
  const handleReply = (newReply) => {
    setReplies(prev => [...prev, newReply]);
    onReplyAdded?.(newReply);
    setShowReplyForm(false);
  };

  // Update this comment after editing
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

    <div className="card mb-3">
      <div className="card-body">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
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
            <strong>
              {comment.author_details.first_name}{' '}
              {comment.author_details.last_name}
            </strong>
            <small className="text-muted ms-2">
              • {new Date(comment.created_at).toLocaleString()}
            </small>
          </div>
          <div className="btn-group btn-group-sm" role="group">
            {/* Reply toggle */}
            <button
              type="button"
              className="btn btn-outline-secondary"
              title="Reply"
              onClick={() => setShowReplyForm(v => !v)}
            >
              <i className="bi bi-reply-fill"></i>
            </button>
            {/* Edit */}
            <button
              type="button"
              className="btn btn-outline-secondary"
              title="Edit"
              onClick={() => setEditing(true)}
            >
              <i className="bi bi-pencil-fill"></i>
            </button>
            {/* Delete */}
            <button
              type="button"
              className="btn btn-outline-danger"
              title="Delete"
              onClick={() => setShowDelete(true)}
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
                src={
                  comment.image.startsWith('http')
                    ? comment.image
                    : `${cloudinaryBase}${comment.image}`
                }
                alt="Comment"
                className="img-fluid rounded mb-2"
                style={{ maxHeight: '200px', objectFit: 'contain' }}
              />
            )}
          </>
        )}

        {/* Reply controls (stacked vertically) */}
        <div className="d-flex flex-column mb-2">
          <button
            type="button"
            className="btn btn-link btn-sm p-0 mb-1"
            onClick={() => setShowReplies(v => !v)}
          >
            {showReplies
              ? 'Hide replies'
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
          replies.map(reply => (
            <div
              key={reply.id}
              className="ms-4 ps-3 border-start mt-2"
            >
              <div className="d-flex justify-content-between align-items-center">
                <strong>
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
                  {reply.author_details.first_name}{' '}
                  {reply.author_details.last_name}
                </strong>
                <small className="text-muted ms-2">
                  • {new Date(reply.created_at).toLocaleString()}
                </small>
              </div>
              <p className="mb-1">{reply.content}</p>
              {reply.image && (
                <img
                  src={
                    reply.image.startsWith('http')
                      ? reply.image
                      : `${cloudinaryBase}${reply.image}`
                  }
                  alt="Reply"
                  className="img-fluid rounded mb-2"
                  style={{ maxHeight: '150px', objectFit: 'contain' }}
                />
              )}
            </div>
          ))}
      </div>
    </div>
  </>
);

}
