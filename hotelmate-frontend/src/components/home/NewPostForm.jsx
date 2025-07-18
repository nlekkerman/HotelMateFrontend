// src/components/home/NewPostForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

export default function NewPostForm() {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const { token } = useAuth();

  // Upload image to Cloudinary using unsigned preset
  const uploadToCloudinary = async () => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', 'YOUR_UNSIGNED_PRESET');
    const res = await axios.post(
      'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload',
      data
    );
    return res.data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = '';
    if (file) {
      setUploading(true);
      try {
        imageUrl = await uploadToCloudinary();
      } finally {
        setUploading(false);
      }
    }

    await axios.post(
      '/api/posts/',
      { content, image: imageUrl },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Reset form
    setContent('');
    setFile(null);
    // Refresh the feed
    queryClient.invalidateQueries(['posts']);
  };

  return (
    <div className="card p-4">
      <form onSubmit={handleSubmit}>
        <textarea
          className="form-control mb-3"
          rows="3"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />

        <div className="mb-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Post'}
        </button>
      </form>
    </div>
  );
}
