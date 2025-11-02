import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";

const ChatHomePage = ({ selectedRoom, onSelectRoom, onUnreadChange }) => {
  const { hotelSlug } = useParams();
  const { user } = useAuth();
  const { conversations } = useChat();
  const userId = user?.id;

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(true); // Always start with sidebar visible

  // Get the full conversation object
  const currentConversation = conversations.find(
    (c) => c.conversation_id === selectedConversation
  );

  // Listen to window resize to auto-show/hide sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowSidebar(true);
      } else {
        // On mobile, show sidebar only if no room is selected
        setShowSidebar(!selectedConversation);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedConversation]);

  const handleSelectRoom = (roomNumber, conversationId) => {
    // On mobile, selecting a room shows the chat window (hides sidebar)
    // On desktop, it just selects the room
    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
      onSelectRoom(null, null);
      if (isMobile) setShowSidebar(true);
    } else {
      setSelectedConversation(conversationId);
      onSelectRoom(roomNumber, conversationId);
      if (isMobile) setShowSidebar(false);
    }
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
    onSelectRoom(null, null);
    if (isMobile) setShowSidebar(true);
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  return (
    <div className="chat-layout">
      {/* Mobile: Show either sidebar OR chat window */}
      {/* Desktop: Show both sidebar and chat window side by side */}
      
      {/* Sidebar - On mobile, only show when no room selected */}
      {(showSidebar || !isMobile) && (
        <ChatSidebar
          hotelSlug={hotelSlug}
          selectedRoom={selectedRoom}
          onSelectRoom={handleSelectRoom}
          onUnreadChange={onUnreadChange}
          isMobile={isMobile}
          toggleSidebar={toggleSidebar}
        />
      )}

      {/* Main content */}
      <main className={`chat-main ${isMobile && selectedConversation ? 'mobile-chat-active' : ''}`}>
        {selectedRoom && selectedConversation && currentConversation ? (
          <ChatWindow
            hotelSlug={hotelSlug}
            conversationId={selectedConversation}
            roomNumber={selectedRoom}
            userId={userId}
            onClose={handleCloseChat}
            conversationData={currentConversation}
          />
        ) : !isMobile ? (
          <div className="chat-placeholder">
            <h2>Chat Rooms</h2>
            <p>Select a room to start chatting.</p>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default ChatHomePage;
