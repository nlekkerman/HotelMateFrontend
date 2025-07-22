// src/components/home/Feed.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import Post from "@/components/home/Post";
import PostComposer from "@/components/home/PostComposer";

export default function Feed() {
  const { hotelSlug: qrHotelSlug } = useParams();

  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const hotelSlug =
    qrHotelSlug ||
    (() => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        return storedUser?.hotel_slug || null;
      } catch {
        return null;
      }
    })();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/home/${hotelSlug}/posts/`);
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
  };

  useEffect(() => {
    if (!hotelSlug) {
      setError("Hotel not found.");
      setLoading(false);
    } else {
      fetchPosts();
    }
  }, [hotelSlug]);

  // Add a newly created post at the top
  const handleNewPost = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  return (
    <div className="feed">
      {hotelSlug && (
        <PostComposer hotelSlug={hotelSlug} onPostCreated={handleNewPost} />
      )}
      <hr />
      {loading ? (
        <p>Loading posts...</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        posts.map(post => (
          <Post
            key={post.id}
            post={post}
            onPostUpdated={fetchPosts}  // ← pass this so Post can refresh the feed
          />
        ))
      )}
    </div>
  );
}
