import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useTheme } from "@/context/ThemeContext";

const ChatHomePage = ({ selectedRoom, onSelectRoom, onUnreadChange }) => {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations } = useChat();
  const { mainColor } = useTheme();
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
      {/* Mobile Quick Actions - Same style as desktop */}
      <div 
        className="d-lg-none position-fixed start-0 end-0"
        style={{
          top: "60px",
          zIndex: 1045,
          background: "transparent",
        }}
      >
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-2 flex-wrap">
            <button className="contextual-action-btn" onClick={() => navigate(`/hotel/${hotelSlug}/chat`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-chat-dots-fill" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>All Chats</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate(`/${hotelSlug}/staff-chat`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-people" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Staff Chat</span>
            </button>
            <button className="contextual-action-btn" onClick={() => {}} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-bell" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Notifications</span>
            </button>
          </div>
        </div>
      </div>

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
