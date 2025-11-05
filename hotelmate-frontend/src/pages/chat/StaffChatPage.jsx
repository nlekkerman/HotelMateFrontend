import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { StaffChatContainer } from '@/staff_chat';
import { useNavigate } from 'react-router-dom';

/**
 * StaffChatPage Component
 * Full page view for staff chat functionality
 */
const StaffChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hotelSlug = user?.hotel_slug;

  if (!hotelSlug) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          Please log in to access staff chat.
        </div>
      </div>
    );
  }

  const handleNavigateToConversation = (conversation) => {
    // Navigate to the guest chat with the conversation
    // This can be customized based on your routing structure
    console.log('Navigate to conversation:', conversation);
    // For now, you might want to navigate to the existing chat page
    // navigate(`/hotel/${hotelSlug}/chat?conversation=${conversation.id}`);
  };

  return (
    <div className="container-fluid p-0">
      <div className="row g-0">
        <div className="col-12">
          <StaffChatContainer
            hotelSlug={hotelSlug}
            onNavigateToConversation={handleNavigateToConversation}
          />
        </div>
      </div>
    </div>
  );
};

export default StaffChatPage;
