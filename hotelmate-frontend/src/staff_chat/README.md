# Staff Chat Module

A complete, modular staff chat implementation for the HotelMate frontend application.

## 📁 Structure

```
src/staff_chat/
├── components/           # React components
│   ├── StaffChatContainer.jsx    # Main container component
│   ├── StaffChatList.jsx         # Staff list with search
│   ├── StaffListItem.jsx         # Individual staff item
│   ├── StaffAvatar.jsx           # Avatar component
│   ├── OnDutyBadge.jsx           # On-duty status badge
│   └── SearchInput.jsx           # Reusable search input
├── hooks/                # Custom React hooks
│   ├── useStaffList.js           # Fetch & manage staff list
│   ├── useStartConversation.js   # Create conversations
│   └── useStaffSearch.js         # Search functionality
├── services/             # API services
│   └── staffChatApi.js           # All API calls
├── staffChat.css         # Complete styles
└── index.js              # Centralized exports
```

## 🚀 Quick Start

### Basic Usage

```jsx
import { StaffChatContainer } from './staff_chat';

function App() {
  const hotelSlug = 'grand-hotel';
  const authToken = 'your-auth-token';

  const handleNavigateToConversation = (conversation) => {
    console.log('Navigate to conversation:', conversation.id);
    // Implement your navigation logic here
  };

  return (
    <StaffChatContainer
      hotelSlug={hotelSlug}
      authToken={authToken}
      onNavigateToConversation={handleNavigateToConversation}
    />
  );
}
```

### Using Just the Staff List

```jsx
import { StaffChatList } from './staff_chat';

function StaffDirectory() {
  const handleConversationCreated = (conversation) => {
    // Handle conversation creation
    console.log('Conversation created:', conversation);
  };

  return (
    <StaffChatList
      hotelSlug="grand-hotel"
      authToken="your-token"
      onConversationCreated={handleConversationCreated}
    />
  );
}
```

### Using Individual Components

```jsx
import { 
  StaffAvatar, 
  OnDutyBadge, 
  SearchInput 
} from './staff_chat';

function CustomComponent() {
  return (
    <div>
      <StaffAvatar
        imageUrl="https://example.com/avatar.jpg"
        fullName="John Doe"
        size="large"
        isOnline={true}
      />
      
      <OnDutyBadge isOnDuty={true} showText={true} size="medium" />
      
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search..."
      />
    </div>
  );
}
```

### Using Hooks Directly

```jsx
import { useStaffList, useStartConversation } from './staff_chat';

function CustomStaffView() {
  const { staffList, loading, error } = useStaffList(
    'grand-hotel',
    'auth-token',
    'search-term'
  );

  const { startConversation, loading: conversationLoading } = 
    useStartConversation('grand-hotel', 'auth-token');

  const handleChatClick = async (staffId) => {
    const conversation = await startConversation([staffId]);
    console.log('Created:', conversation);
  };

  // Your custom implementation
}
```

## 🔧 API Configuration

Update the API URL in your `.env` file:

```env
VITE_API_URL=https://your-api-domain.com
```

## 📦 Components API

### StaffChatContainer

Main container component managing the chat flow.

**Props:**
- `hotelSlug` (string, required): Hotel identifier
- `authToken` (string, required): Authentication token
- `onNavigateToConversation` (function, optional): Custom navigation handler
- `renderConversationView` (function, optional): Custom conversation view renderer

### StaffChatList

Displays searchable list of staff members.

**Props:**
- `hotelSlug` (string, required): Hotel identifier
- `authToken` (string, required): Authentication token
- `onConversationCreated` (function, optional): Callback when conversation is created

### StaffListItem

Individual staff member item.

**Props:**
- `staff` (object, required): Staff member data
- `onStartChat` (function, required): Chat initiation handler
- `isLoading` (boolean, optional): Loading state

### StaffAvatar

Displays staff avatar or initials.

**Props:**
- `imageUrl` (string, optional): Avatar image URL
- `fullName` (string, required): Staff member name
- `size` (string, optional): 'small' | 'medium' | 'large'
- `isOnline` (boolean, optional): Online status indicator

### OnDutyBadge

Shows on-duty status badge.

**Props:**
- `isOnDuty` (boolean, required): Duty status
- `showText` (boolean, optional): Show "On Duty" text
- `size` (string, optional): 'small' | 'medium' | 'large'

### SearchInput

Reusable search input component.

**Props:**
- `value` (string, required): Current search value
- `onChange` (function, required): Change handler
- `onClear` (function, optional): Clear handler
- `placeholder` (string, optional): Input placeholder
- `disabled` (boolean, optional): Disabled state

## 🎣 Hooks API

### useStaffList(hotelSlug, authToken, searchTerm, ordering)

Fetches and manages staff list.

**Returns:**
- `staffList`: Array of staff members
- `loading`: Loading state
- `error`: Error message if any
- `refetch`: Function to refetch data

### useStartConversation(hotelSlug, authToken)

Creates conversations with staff members.

**Returns:**
- `startConversation(participantIds, title)`: Function to start conversation
- `loading`: Loading state
- `error`: Error message if any
- `conversation`: Created conversation object
- `reset()`: Reset state function

### useStaffSearch(debounceDelay)

Manages search state with debouncing.

**Returns:**
- `searchTerm`: Current search term
- `debouncedSearchTerm`: Debounced search term
- `handleSearchChange(value)`: Search change handler
- `clearSearch()`: Clear search function

## 🎨 Styling

The module includes complete CSS styling that can be customized using CSS variables:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-hover: #f0f0f0;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --primary-color: #007bff;
  --primary-color-dark: #0056b3;
  --primary-color-light: #66b3ff;
  --border-color: #e0e0e0;
  --border-color-dark: #b0b0b0;
  --avatar-bg: #e0e0e0;
}
```

## 📱 Responsive Design

The module is fully responsive with breakpoints at:
- **768px**: Tablet adjustments
- **480px**: Mobile optimizations

## 🔗 Integration Example

```jsx
// App.jsx
import React from 'react';
import { StaffChatContainer } from './staff_chat';
import { useAuth } from './context/AuthContext';
import { useHotel } from './hooks/useHotel';

function App() {
  const { token } = useAuth();
  const { hotelSlug } = useHotel();

  return (
    <div className="app">
      <StaffChatContainer
        hotelSlug={hotelSlug}
        authToken={token}
        onNavigateToConversation={(conversation) => {
          // Navigate to your chat view
          window.location.href = `/chat/${conversation.id}`;
        }}
      />
    </div>
  );
}

export default App;
```

## 🧪 Features

✅ **Search & Filter**: Real-time search with debouncing  
✅ **Responsive Design**: Works on all screen sizes  
✅ **Loading States**: Visual feedback during operations  
✅ **Error Handling**: Graceful error messages and retry options  
✅ **Avatar Support**: Profile images with fallback initials  
✅ **On-Duty Indicators**: Visual status badges  
✅ **Modular Architecture**: Use individual components or the full container  
✅ **TypeScript Ready**: PropTypes included for all components  
✅ **Accessible**: ARIA labels and keyboard navigation support  

## 📝 Next Steps

After implementing this module, you can:

1. **Add Message View**: Create components to display messages
2. **Add WebSocket Support**: Real-time message updates
3. **Add Group Chat**: Multi-participant conversations
4. **Add File Upload**: Share files in conversations
5. **Add Notifications**: Push notifications for new messages

## 🐛 Troubleshooting

**Staff list not loading?**
- Check that `VITE_API_URL` is correctly set
- Verify authentication token is valid
- Check browser console for API errors

**Styles not applying?**
- Ensure `staffChat.css` is imported
- Check for CSS conflicts with existing styles
- Verify CSS variables are defined

**Search not working?**
- Check network requests in DevTools
- Verify backend search endpoint is working
- Ensure search parameters are correctly formatted

## 📄 License

Part of the HotelMate Frontend application.
