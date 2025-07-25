import React, { useEffect, useMemo, useState, useCallback } from "react";
import CommentItem from "@/components/home/CommentItem";
import CommentComposer from "@/components/home/CommentComposer";

const PREVIEW_COUNT = 2;

export default function CommentsSection({
  postId,
  hotelSlug,
  initialComments = [],
  initialCount = 0,
}) {
  const [comments, setComments] = useState(initialComments);
  const [commentCount, setCommentCount] = useState(initialCount);
  const [showAll, setShowAll] = useState(false);

  // 🔄 keep local state in sync when parent gives us fresh data
  useEffect(() => {
    setComments(initialComments);
    setCommentCount(initialCount);
  }, [initialComments, initialCount]);

  // Handlers are memoized to avoid re-renders in children
  const handleAdd = useCallback((newComment) => {
    setComments((prev) => [...prev, newComment]);
    setCommentCount((prev) => prev + 1);
  }, []);

  const handleUpdate = useCallback((updated) => {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const handleDelete = useCallback((deletedId) => {
    setComments((prev) => prev.filter((c) => c.id !== deletedId));
    setCommentCount((prev) => Math.max(prev - 1, 0));
  }, []);

  const { listToShow, hiddenCount } = useMemo(() => {
    if (showAll) {
      return {
        listToShow: comments,
        hiddenCount: Math.max(commentCount - comments.length, 0),
      };
    }
    const previewList = comments.slice(-PREVIEW_COUNT);
    return {
        listToShow: previewList,
        hiddenCount: Math.max(commentCount - previewList.length, 0),
    };
  }, [comments, commentCount, showAll]);

  return (
    <div className="card-body">
      {listToShow.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          hotelSlug={hotelSlug}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReplyAdded={() => { /* no-op for now */ }}
        />
      ))}

      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          className="btn btn-link btn-sm p-0 mt-1"
          onClick={() => setShowAll(true)}
        >
          View other {hiddenCount} {hiddenCount > 1 ? "comments" : "comment"}
        </button>
      )}

      {showAll && commentCount > comments.length && (
        <div className="text-muted small">
          (Only {comments.length} loaded out of {commentCount})
        </div>
      )}

      <CommentComposer
        postId={postId}
        hotelSlug={hotelSlug}
        onCommentAdded={handleAdd}
      />
    </div>
  );
}
