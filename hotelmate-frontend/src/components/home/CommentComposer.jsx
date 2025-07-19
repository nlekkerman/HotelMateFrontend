import React, { useState } from 'react';
import api from '@/services/api';

export default function CommentComposer({ postId, hotelSlug, onCommentAdded }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    const formData = new FormData();
    formData.append('content', content);
    if (image) formData.append('image', image);

    setSubmitting(true);
    try {
      await api.post(`/home/${hotelSlug}/posts/${postId}/comments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setContent('');
      setImage(null);
      onCommentAdded(); // ✅ refresh parent post
    } catch (err) {
      console.error('Failed to comment:', err.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        className="form-control mb-1"
        rows={2}
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        className="form-control mb-2"
        onChange={(e) => setImage(e.target.files[0])}
      />
      <button type="submit" className="btn btn-sm btn-outline-primary" disabled={submitting}>
        {submitting ? 'Posting...' : 'Comment'}
      </button>
    </form>
  );
}
