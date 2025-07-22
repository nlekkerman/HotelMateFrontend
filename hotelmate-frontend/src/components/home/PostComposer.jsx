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
    <form onSubmit={handleSubmit} className="card p-3 shadow-sm mb-3">
      <textarea
        className="form-control border-0"
        placeholder="Share your thoughts..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        style={{ resize: 'none', fontSize: '0.95rem' }}
      />
      
      <div className="d-flex justify-content-between align-items-center mt-2">
        <div>
          <label htmlFor="post-image" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-image"></i>
          </label>
          <input
            id="post-image"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => setImage(e.target.files[0])}
          />
        </div>
        
        {(content.trim() || image) && (
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        )}
      </div>
    </form>
  );
}
