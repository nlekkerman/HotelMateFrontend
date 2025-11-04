# 📎 File Upload Configuration Guide

## Overview

The chat system supports file and image uploads with automatic storage in **Cloudinary**. This guide explains how to configure and use the file upload feature.

## 🔧 Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Cloudinary Configuration (Required for file uploads)
VITE_CLOUDINARY_BASE=https://res.cloudinary.com/your-cloud-name/
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name

# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_API_BASE_URL=http://localhost:8000

# Pusher (Real-time messaging)
VITE_PUSHER_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=your_cluster
```

### Getting Cloudinary Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy your **Cloud Name**
4. Set in `.env`:
   ```env
   VITE_CLOUDINARY_BASE=https://res.cloudinary.com/YOUR_CLOUD_NAME/
   VITE_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
   ```

## 📋 File Constraints

### Supported File Types
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- **PDF**: `.pdf`
- **Documents**: `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.csv`

### File Size Limit
- **Maximum**: 10MB per file
- Multiple files can be uploaded in one message

## 🚀 Features

### ✅ Implemented Features

1. **Client-Side Validation**
   - File size validation (10MB max)
   - File type validation
   - User-friendly error messages

2. **Cloudinary Integration**
   - Automatic upload to cloud storage
   - Full CDN URLs returned
   - Thumbnail generation for images
   - Secure file storage

3. **UI Components**
   - File selection button with icon
   - File preview with remove option
   - Image thumbnails
   - Document icons (PDF, Office files)
   - Download buttons for documents

4. **Real-time Updates**
   - Pusher notifications for new attachments
   - FCM push notifications
   - Live message status (pending, delivered, seen)

5. **Message Display**
   - Inline image display (clickable for full size)
   - Document cards with download buttons
   - File size and type indicators
   - Support for multiple attachments per message

## 🎨 Usage Examples

### For Staff
```jsx
// Staff can upload files with authentication token
// Token is automatically included from localStorage
1. Click 📎 button in chat input
2. Select one or more files
3. Preview appears above input
4. Click Send to upload to Cloudinary and send message
```

### For Guests
```jsx
// Guests upload with session token
// Session token is automatically managed by GuestChatSession
1. Click 📎 button in chat input
2. Select files (validated on client)
3. Files are uploaded to Cloudinary via backend
4. Staff receives real-time notification
```

## 🔍 How It Works

### Upload Flow

```
User selects files
    ↓
Client validates (size, type)
    ↓
FormData created with files + message
    ↓
POST to backend endpoint with auth
    ↓
Backend uploads to Cloudinary
    ↓
Backend saves message with file URLs
    ↓
Backend returns full Cloudinary URLs
    ↓
Client displays images/documents
    ↓
Pusher/FCM notify other party
```

### File URL Format

Files are stored in Cloudinary with organized paths:
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/
  image/upload/v{version}/
    chat/{hotel-slug}/room_{number}/{year}/{month}/{day}/
      {filename}.{ext}
```

Example:
```
https://res.cloudinary.com/dg0ssec7u/image/upload/v1730728200/
  chat/hotel-killarney/room_101/2025/11/04/
    invoice-abc123.pdf
```

## 🐛 Troubleshooting

### Issue: "File too large" error
**Solution**: Check file size. Max is 10MB per file.
```javascript
// Check file size in KB
const sizeKB = file.size / 1024;
const sizeMB = sizeKB / 1024;
console.log(`File size: ${sizeMB.toFixed(2)}MB`);
```

### Issue: "File type not allowed"
**Solution**: Verify file type is in allowed list.
```javascript
console.log('File type:', file.type);
// Should be one of: image/jpeg, application/pdf, etc.
```

### Issue: Images not displaying
**Solution**: 
1. Check `.env` has correct `VITE_CLOUDINARY_BASE`
2. Verify Cloudinary credentials on backend
3. Check browser console for URL errors
4. Test URL directly in browser

### Issue: Upload fails with 413 error
**Solution**: 
- Backend nginx/proxy has size limit
- Check backend configuration
- Reduce file sizes or split into multiple messages

### Issue: Files upload but show local paths
**Solution**: 
- Backend must be configured with Cloudinary
- Check backend `.env` has `CLOUDINARY_URL`
- Verify `cloudinary` is in backend `INSTALLED_APPS`

## 📊 Backend Requirements

### Required Backend Setup

1. **Cloudinary Configuration**
   ```python
   # Backend .env
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   ```

2. **Installed Apps**
   ```python
   INSTALLED_APPS = [
       # ...
       'cloudinary',
       'cloudinary_storage',
   ]
   ```

3. **File Upload Endpoint**
   ```
   POST /api/chat/{hotel_slug}/conversations/{conversation_id}/upload-attachment/
   ```

## 🔐 Security

### File Validation
- Client-side: Size and type checked before upload
- Server-side: Double validation on backend
- File extensions validated against whitelist
- Filenames sanitized to prevent injection

### Authentication
- **Staff**: Token-based (stored in localStorage)
- **Guests**: Session token (managed by GuestChatSession)
- All uploads require valid authentication

### Storage Security
- Files stored in Cloudinary (not on server)
- URLs are publicly accessible but unguessable
- Organized by hotel/room for access control
- Can enable Cloudinary access restrictions if needed

## 📝 Code Reference

### Key Files
- `ChatWindow.jsx` - Main chat component with upload
- `GuestChatSession.js` - Guest session management
- `.env.example` - Environment variable template

### Key Functions
- `handleFileSelect()` - Validates and adds files
- `handleSendMessage()` - Uploads via FormData
- `getCloudinaryUrl()` - Ensures full CDN URLs

### Environment Variables Used
```javascript
const CLOUDINARY_BASE = import.meta.env.VITE_CLOUDINARY_BASE;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

## ✅ Testing Checklist

- [ ] Upload single image (< 1MB)
- [ ] Upload large image (close to 10MB)
- [ ] Upload multiple images at once
- [ ] Upload PDF document
- [ ] Upload Office document (.docx, .xlsx)
- [ ] Try invalid file type (.exe)
- [ ] Try oversized file (> 10MB)
- [ ] Send message with text + files
- [ ] Send message with only files (no text)
- [ ] Verify images display inline
- [ ] Verify documents show download button
- [ ] Test download functionality
- [ ] Verify real-time delivery to other party
- [ ] Check Cloudinary URLs are correct
- [ ] Test on mobile device

## 🚀 Future Enhancements

Potential improvements:
- [ ] Image compression before upload
- [ ] Progress bar for large uploads
- [ ] Drag-and-drop file upload
- [ ] Paste images from clipboard
- [ ] Video file support
- [ ] Audio message recording
- [ ] File upload queue with retry
- [ ] Multiple file selection preview grid

---

**Last Updated**: November 4, 2025  
**Status**: ✅ Fully Implemented  
**Storage**: Cloudinary Cloud CDN  
**Max File Size**: 10MB per file
