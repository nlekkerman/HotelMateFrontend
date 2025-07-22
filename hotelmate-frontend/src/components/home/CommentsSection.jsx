import React, { useState } from 'react';
import CommentItem from '@/components/home/CommentItem';
import CommentComposer from '@/components/home/CommentComposer';
import api from '@/services/api';

const PREVIEW_COUNT = 2;

export default function CommentsSection({
  postId,
  hotelSlug,
  initialComments,
  initialCount,
}) {
  const [comments, setComments]       = useState(initialComments);
  const [commentCount, setCommentCount] = useState(initialCount);
  const [showAll, setShowAll]         = useState(false);

  // Create a new root comment
  const handleAdd = async (newComment) => {
    // newComment comes from API via CommentComposer
    setComments(prev => [...prev, newComment]);
    setCommentCount(prev => prev + 1);
  };

  // Update an existing root comment
  const handleUpdate = (updated) => {
    setComments(prev =>
      prev.map(c => (c.id === updated.id ? updated : c))
    );
  };

  // Delete a root comment
  const handleDelete = (deletedId) => {
    setComments(prev => prev.filter(c => c.id !== deletedId));
    setCommentCount(prev => prev - 1);
  };

  // Preview vs full list
  const previewList = comments.slice(-PREVIEW_COUNT);
  const listToShow  = showAll ? comments : previewList;
  const hiddenCount = commentCount - previewList.length;

  return (
    <div className="card-body">
      {listToShow.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          hotelSlug={hotelSlug}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReplyAdded={(reply) => {
            // replies are nested inside CommentItem, so no-op here
          }}
        />
      ))}

      {hiddenCount > 0 && (
        <button
          type="button"
          className="btn btn-link btn-sm p-0 mt-1"
          onClick={() => setShowAll(v => !v)}
        >
          {showAll
            ? 'Hide comments'
            : `View other ${hiddenCount > 1 ? 'comments' : 'comment'}`}
        </button>
      )}

      {/* Composer for new top-level comments */}
      <CommentComposer
        postId={postId}
        hotelSlug={hotelSlug}
        onCommentAdded={handleAdd}
      />
    </div>
  );
}
