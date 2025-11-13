/**
 * Staff Chat Module
 * Centralized exports for all staff chat components, hooks, and services
 */

// Components
export { default as StaffChatContainer } from './components/StaffChatContainer';
export { default as StaffChatList } from './components/StaffChatList';
export { default as StaffListItem } from './components/StaffListItem';
export { default as StaffAvatar } from './components/StaffAvatar';
export { default as OnDutyBadge } from './components/OnDutyBadge';
export { default as SearchInput } from './components/SearchInput';
export { default as StaffChatFloatingButton } from './components/StaffChatFloatingButton';
export { default as ConversationView } from './components/ConversationView';
export { default as MessengerWidget } from './components/MessengerWidget';
export { default as ConversationsList } from './components/ConversationsList';
export { default as ChatWindowPopup } from './components/ChatWindowPopup';

// Context
export { MessengerProvider, useMessenger } from './context/MessengerContext';

// Hooks
export { default as useStaffList } from './hooks/useStaffList';
export { default as useStartConversation } from './hooks/useStartConversation';
export { default as useStaffSearch } from './hooks/useStaffSearch';
export { default as useConversations } from './hooks/useConversations';

// Services
export * from './services/staffChatApi';

// Styles
import './staffChat.css';
