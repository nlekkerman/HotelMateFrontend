import React, { useState } from 'react';
import PropTypes from 'prop-types';
import useStaffList from '../hooks/useStaffList';
import useStaffSearch from '../hooks/useStaffSearch';
import useStartConversation from '../hooks/useStartConversation';
import SearchInput from './SearchInput';
import StaffListItem from './StaffListItem';

/**
 * StaffChatList Component
 * Main component for displaying and searching staff members
 */
const StaffChatList = ({ hotelSlug, onConversationCreated }) => {
  const [initiatingChatWithId, setInitiatingChatWithId] = useState(null);
  
  // Search functionality
  const { searchTerm, debouncedSearchTerm, handleSearchChange, clearSearch } = useStaffSearch();
  
  // Fetch staff list with search
  const { staffList, loading, error, refetch } = useStaffList(
    hotelSlug,
    debouncedSearchTerm
  );
  
  // Conversation creation
  const {
    startConversation,
    loading: conversationLoading,
    error: conversationError
  } = useStartConversation(hotelSlug);

  const handleStartChat = async (staffId) => {
    setInitiatingChatWithId(staffId);
    
    try {
      const conversation = await startConversation([staffId]);
      
      if (conversation && onConversationCreated) {
        // Find the selected staff member to pass along
        const selectedStaff = staffList.find(staff => staff.id === staffId);
        onConversationCreated(conversation, selectedStaff);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setInitiatingChatWithId(null);
    }
  };

  const handleRetry = () => {
    refetch();
  };

  // Error state
  if (error) {
    return (
      <div className="staff-chat-list-error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load staff list</h3>
        <p>{error}</p>
        <button onClick={handleRetry} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="staff-chat-list">
      <div className="staff-chat-list__header">
        <h2 className="staff-chat-list__title">Start a Conversation</h2>
        <p className="staff-chat-list__subtitle">
          Select a staff member to start chatting
        </p>
      </div>

      <div className="staff-chat-list__search">
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          onClear={clearSearch}
          placeholder="Search by name, role, or department..."
          disabled={loading}
        />
      </div>

      {conversationError && (
        <div className="staff-chat-list__error-message">
          <span className="error-icon-small">⚠️</span>
          {conversationError}
        </div>
      )}

      <div className="staff-chat-list__content">
        {loading ? (
          <div className="staff-chat-list__loading">
            <div className="spinner" />
            <p>Loading staff members...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="staff-chat-list__empty">
            <div className="empty-icon">👥</div>
            <h3>No staff found</h3>
            <p>
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No staff members available at the moment'}
            </p>
          </div>
        ) : (
          <ul className="staff-list">
            {staffList.map((staff) => (
              <StaffListItem
                key={staff.id}
                staff={staff}
                onStartChat={handleStartChat}
                isLoading={initiatingChatWithId === staff.id}
              />
            ))}
          </ul>
        )}
      </div>

      {!loading && staffList.length > 0 && (
        <div className="staff-chat-list__footer">
          <p className="staff-count">
            {staffList.length} staff member{staffList.length !== 1 ? 's' : ''} found
          </p>
        </div>
      )}
    </div>
  );
};

StaffChatList.propTypes = {
  hotelSlug: PropTypes.string.isRequired,
  onConversationCreated: PropTypes.func
};

export default StaffChatList;
