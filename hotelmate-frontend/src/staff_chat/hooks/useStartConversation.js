import { useState } from 'react';
import { createConversation } from '../services/staffChatApi';

/**
 * Custom hook to start a conversation with staff members
 * @param {string} hotelSlug - The hotel's slug identifier
 * @returns {Object} Conversation creation state and function
 */
const useStartConversation = (hotelSlug) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversation, setConversation] = useState(null);

  const startConversation = async (participantIds, title = null) => {
    if (!hotelSlug) {
      setError('Missing hotel slug');
      return null;
    }

    if (!participantIds || participantIds.length === 0) {
      setError('At least one participant is required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const newConversation = await createConversation(
        hotelSlug,
        participantIds,
        title
      );
      setConversation(newConversation);
      return newConversation;
    } catch (err) {
      setError(err.message);
      console.error('Error starting conversation:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setConversation(null);
    setError(null);
    setLoading(false);
  };

  return {
    startConversation,
    loading,
    error,
    conversation,
    reset
  };
};

export default useStartConversation;
