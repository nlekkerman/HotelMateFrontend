// src/components/home/Feed.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/services/api";
import Post from "@/components/home/Post";
import PostComposer from "@/components/home/PostComposer";
import { useAuth } from '@/context/AuthContext';

export default function Feed() {
  const { hotelSlug: qrHotelSlug } = useParams();
  const { user: authUser } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hotelSlug = qrHotelSlug || authUser?.hotel_slug || null;

  // Fetch posts with memoized function
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff/hotel/${hotelSlug}/home/posts/`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setPosts(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load posts:", err);
      setError("Failed to load posts.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [hotelSlug]);

  useEffect(() => {
    if (!hotelSlug) {
      setError("Hotel not found.");
      setLoading(false);
    } else {
      fetchPosts();
    }
  }, [hotelSlug, fetchPosts]);

  // After creating a new post, simply re-fetch
  const handleNewPost = () => {
    fetchPosts();
  };

  return (
    <div className="feed ">
      
      {hotelSlug && (
        <PostComposer hotelSlug={hotelSlug} onPostCreated={handleNewPost} />
      )}
      
      {loading ? (
        <div className="feed-loading">
          <div>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading posts...</p>
          </div>
        </div>
      ) : error ? (
        <div className="feed-error">
          <i className="bi bi-exclamation-triangle-fill mb-2" style={{ fontSize: '2rem' }}></i>
          <p className="mb-0">{error}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">📝</div>
          <div className="feed-empty-text">No posts yet</div>
          <div className="feed-empty-subtext">Be the first to share something!</div>
        </div>
      ) : (
        posts.map((post) => (
          <Post
            key={post.id}
            post={post}
            onPostUpdated={fetchPosts} // refresh feed after edit/delete
          />
        ))
      )}
    </div>
  );
}
