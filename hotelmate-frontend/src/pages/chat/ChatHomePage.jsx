import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuth } from "@/context/AuthContext";
import { FaBars } from "react-icons/fa";

const ChatHomePage = ({ selectedRoom, onSelectRoom, onUnreadChange }) => {
  const { hotelSlug } = useParams();
  const { user } = useAuth();
  const userId = user?.id;

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);

  // Listen to window resize to auto-show/hide sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setShowSidebar(true);
      else setShowSidebar(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSelectRoom = (roomNumber, conversationId) => {
    setSelectedConversation(conversationId);
    onSelectRoom(roomNumber, conversationId);

    if (window.innerWidth < 768) setShowSidebar(false); // auto hide on small screens
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      {showSidebar && (
        <ChatSidebar
          hotelSlug={hotelSlug}
          selectedRoom={selectedRoom}
          onSelectRoom={handleSelectRoom}
          onUnreadChange={onUnreadChange} // now defined
          isMobile={window.innerWidth < 768}
          toggleSidebar={toggleSidebar}
        />

      )}

      {/* Hamburger icon only on small screens */}
      {!showSidebar && window.innerWidth < 768 && (
        <button className="hamburger-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
      )}

      {/* Main content */}
      <main className="chat-main">
        {selectedRoom && selectedConversation ? (
          <ChatWindow
            hotelSlug={hotelSlug}
            conversationId={selectedConversation}
            userId={userId}
          />
        ) : (
          <div className="chat-placeholder">
            <h2>Chat Rooms</h2>
            <p>Select a room from the sidebar to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatHomePage;
