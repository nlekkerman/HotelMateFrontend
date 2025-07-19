import React, { useEffect, useState } from 'react';
import CommentComposer from '@/components/home/CommentComposer';
import api from '@/services/api';

const cloudinaryBase = 'https://res.cloudinary.com/dg0ssec7u/';

export default function Post({ post, onPostUpdated }) {
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    try {
      await api.post(`/home/${post.hotel_slug}/posts/${post.id}/like/`);
      onPostUpdated(); // refetch post list
    } catch (err) {
      console.error("Failed to like post", err.response?.data || err);
    }
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <h6 className="card-subtitle mb-1 text-muted">
          {post.author_details?.first_name} {post.author_details?.last_name} •{" "}
          {new Date(post.created_at).toLocaleString()}
        </h6>

        <p className="card-text">{post.content}</p>

        {post.image && (
          <img
            src={
              post.image.startsWith("http")
                ? post.image
                : `${cloudinaryBase}${post.image}`
            }
            alt="Post"
            className="img-fluid rounded"
            style={{ maxHeight: '400px', objectFit: 'contain' }}
          />
        )}

        <div className="mt-2 d-flex align-items-center text-muted">
          <button className="btn btn-sm btn-outline-danger me-2" onClick={handleLike}>
            ❤️ Like
          </button>
          {post.like_count} · 💬 {post.comment_count}
        </div>

        {post.comment_count > 0 && (
          <button
            className="btn btn-link btn-sm p-0 mt-1"
            onClick={() => setShowComments(!showComments)}
          >
            {showComments ? 'Hide comments' : `View comments (${post.comment_count})`}
          </button>
        )}

        {showComments && post.comments.map(comment => (
          <div key={comment.id} className="mt-2 ps-3 border-start">
            <strong>{comment.author_details?.first_name} {comment.author_details?.last_name}</strong>: {comment.content}
            {comment.image && (
              <img
                src={
                  comment.image.startsWith("http")
                    ? comment.image
                    : `${cloudinaryBase}${comment.image}`
                }
                alt="Comment"
                className="img-fluid mt-1 rounded"
                style={{ maxHeight: '200px', objectFit: 'contain' }}
              />
            )}
          </div>
        ))}

        <CommentComposer
          postId={post.id}
          hotelSlug={post.hotel_slug}
          onCommentAdded={onPostUpdated}
        />
      </div>
    </div>
  );
}
