import React, { useRef, useCallback } from 'react';
import { useInfiniteQuery }            from '@tanstack/react-query';
import api                              from '@/services/api';
import { useAuth }                      from '@/context/AuthContext';
import PostCard                         from '@/components/home/PostCard';

export default function Feed() {
  const { user }  = useAuth();
  const hotelSlug = user?.hotel_slug;

  // 1️⃣ Fetch function
  const fetchPosts = ({ pageParam = 1 }) =>
    api
      .get(`home/${hotelSlug}/posts/`, { params: { page: pageParam } })
      .then(res => res.data);

  // 2️⃣ Query hooks
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts', hotelSlug],
    queryFn: fetchPosts,
    enabled: !!hotelSlug,
    getNextPageParam: last =>
      last.next ? Number(new URL(last.next).searchParams.get('page')) : undefined,
  });

  // 3️⃣ Scroll observer
  const observer = useRef();
  const loadMoreRef = useCallback(
    node => {
      if (isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isFetchingNextPage, fetchNextPage, hasNextPage]
  );

  // 4️⃣ Debug & flatten
  console.log('📦 raw data:', data);
  const allPosts = data?.pages?.flatMap(p => p.results) ?? [];
  console.log('📦 allPosts:', allPosts);

  // 5️⃣ Early returns
  if (!hotelSlug) {
    return <p className="text-center my-4">No hotel selected.</p>;
  }
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading feed…</span>
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="alert alert-danger text-center my-4">
        Error: {error.message}
      </div>
    );
  }
  if (allPosts.length === 0) {
    return (
      <div className="alert alert-info text-center my-4">
        No posts yet.
      </div>
    );
  }

  // 6️⃣ Render
  return (
    <div className="container py-4">
      <h2 className="mb-4">News Feed</h2>
      {allPosts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={loadMoreRef} style={{ height: 1 }} />
      {isFetchingNextPage && (
        <div className="d-flex justify-content-center my-3">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading more…</span>
          </div>
        </div>
      )}
    </div>
  );
}
