import React, { useState } from 'react';
import api from '@/services/api';

export default function PostComposer({ hotelSlug, onPostCreated }) {
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
      const res = await api.post(`/home/${hotelSlug}/posts/`, formData);
      onPostCreated(res.data);
      setContent('');
      setImage(null);
    } catch (err) {
      console.error('Failed to post:', err.response?.data || err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <textarea
        className="form-control mb-2"
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <input
        type="file"
        accept="image/*"
        className="form-control mb-2"
        onChange={(e) => setImage(e.target.files[0])}
      />
      <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
        {submitting ? 'Posting...' : 'Post'}
      </button>
    </form>
  );
}
