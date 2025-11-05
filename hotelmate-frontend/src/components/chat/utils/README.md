# Chat Message Action Utilities

This directory contains reusable utility functions and components for handling chat message actions.

## Files

### `messageReply.js`
Handles all reply-related functionality including:
- Reply state management
- Reply preview rendering
- Reply data formatting

### `messageDelete.js`
Handles message deletion including:
- Soft delete (marks as deleted)
- Hard delete (removes from UI)
- Pusher event handling
- Local state updates

### `messageShare.js`
Handles message sharing (prepared for future implementation):
- Clipboard copy
- Web Share API
- Shareable links (placeholder)
- Export as file (placeholder)

### `messageDownload.js`
Handles downloading attachments:
- Single file downloads
- Bulk downloads
- Cloudinary URL handling
- Message export

### `index.js`
Centralized exports for easy importing:
```javascript
import { handleMessageShare, createReplyHandlers } from '@/components/chat/utils';
```

## Usage

### Quick Start
```javascript
// Import utilities
import {
  createReplyHandlers,
  handleMessageDeletion,
  handleMessageShare,
  handleMessageDownload
} from '@/components/chat/utils';

// Use in your component
const { startReply, cancelReply } = createReplyHandlers(setReplyingTo, messageInputRef);
```

### Individual Imports
```javascript
// Import from specific files
import { ReplyPreview } from './utils/messageReply';
import { DeletedMessageDisplay } from './utils/messageDelete';
```

## Design Principles

1. **Pure Functions** - No side effects where possible
2. **Callback Pattern** - Success/error callbacks for async operations
3. **Reusable Components** - React components for common UI patterns
4. **Type Safety** - Clear function signatures with JSDoc
5. **Error Handling** - Comprehensive error handling with user-friendly messages

## Contributing

When adding new utilities:

1. Create a new file for each major feature (e.g., `messageEdit.js`)
2. Export all functions and components
3. Add exports to `index.js`
4. Update this README
5. Add JSDoc comments for all functions
6. Include usage examples in comments

## Testing

Each utility should be tested independently:

```javascript
// Example test structure
describe('messageReply', () => {
  test('formatReplyData returns correct ID', () => {
    const message = { id: 123, text: 'Hello' };
    expect(formatReplyData(message)).toBe(123);
  });
});
```

## Future Enhancements

- [ ] Message editing utilities
- [ ] Message forwarding utilities
- [ ] Rich text formatting utilities
- [ ] Message search utilities
- [ ] Message filtering utilities
- [ ] Conversation export utilities
