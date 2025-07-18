import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast }                      from 'react-toastify';
import api                             from '@/services/api';
import { useAuth }                     from '@/context/AuthContext';
import { Link }                        from 'react-router-dom';

export default function PostCard({ post }) {
  const { user }  = useAuth();
  const hotelSlug = user?.hotel_slug;
  const qc        = useQueryClient();

  // Guard
  if (!post) {
    return (
      <div className="alert alert-warning">
        ⚠️ Post data missing
      </div>
    );
  }

  // Debug
  console.log('🔍 rendering PostCard:', post);

  // Like mutation (v5 object style)
  const likeMutation = useMutation({
    mutationFn: () =>
      api.post(`home/${hotelSlug}/posts/${post.id}/like/`),
    onSuccess: () => qc.invalidateQueries(['posts', hotelSlug]),
    onError:   () => toast.error('Could not like post.'),
  });

  return (
    <div className="card mb-4 shadow-sm">
      <div className="card-body">
        <h6 className="text-muted mb-2">
          {post.author_name} • {new Date(post.created_at).toLocaleString()}
        </h6>
        {post.content && <p>{post.content}</p>}
        {post.image && (
          <img src={post.image} className="img-fluid rounded mb-3" alt="" />
        )}
        <div className="d-flex">
          <button
            className="btn btn-outline-primary btn-sm me-2"
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isLoading || likeMutation.isSuccess}
          >
            {likeMutation.isLoading
              ? 'Liking…'
              : `Like (${post.like_count})`}
          </button>
          <Link to={`/posts/${post.id}`} className="btn btn-outline-secondary btn-sm">
            Comments ({post.comment_count})
          </Link>
        </div>
      </div>
    </div>
  );
}
