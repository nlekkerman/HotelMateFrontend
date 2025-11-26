# Section-Based Page Editor - Frontend Implementation

## Overview

Complete frontend implementation of the section-based page editor system for hotel public pages. This allows super admins to create and manage dynamic pages with four section types: Hero, Gallery, List/Cards, and News.

## Features

### ✅ Section Management
- **Create sections** with auto-initialization
- **Drag-and-drop reordering** using @hello-pangea/dnd
- **Toggle sections** active/inactive
- **Delete sections** with confirmation
- **Real-time preview** of changes

### ✅ Section Types

#### 1. Hero Section
- **Pre-populated** with placeholder text
- Editable title and description
- **Image uploads**: Hero background & logo
- Cloudinary integration for image storage

#### 2. Gallery Section
- **Multiple gallery containers** per section
- **Bulk image upload** (up to 20 images at once)
- Image captions and alt text
- **Lightbox viewer** for full-size images
- Delete individual images or entire galleries

#### 3. List/Cards Section
- **Multiple list containers** with custom titles
- **Card system** with title, subtitle, description
- **Image uploads** for each card
- Responsive grid layout
- Edit and delete cards individually

#### 4. News Section
- **News items** with date, title, and summary
- **Content blocks** (text and images)
- **Flexible image positioning**: full width, left, right, inline grid
- Ordered content for rich articles
- Expandable/collapsible news items

## File Structure

```
src/
├── services/
│   └── sectionEditorApi.js          # API service for all section operations
├── types/
│   └── sectionEditor.js              # JSDoc type definitions
├── components/
│   └── sections/
│       ├── HeroSectionEditor.jsx     # Hero section management
│       ├── GallerySectionEditor.jsx  # Gallery management
│       ├── ListSectionEditor.jsx     # List/Cards management
│       ├── NewsSectionEditor.jsx     # News management
│       ├── HeroSectionView.jsx       # Hero public view
│       ├── GallerySectionView.jsx    # Gallery public view
│       ├── ListSectionView.jsx       # List public view
│       └── NewsSectionView.jsx       # News public view
├── pages/
│   └── sections/
│       ├── SectionEditorPage.jsx            # Main editor (staff only)
│       └── SectionBasedPublicPage.jsx       # Public viewing page
└── styles/
    └── sections.css                  # Section-specific styles
```

## Routes

### Staff Routes (Protected)
- `/staff/:hotelSlug/section-editor` - Section management page

### Public Routes
- `/hotel/:slug/sections` - Public page with all active sections

## API Endpoints Used

All endpoints follow the pattern: `/api/staff/hotel/<hotel_slug>/...`

### Section Management
- `POST /sections/create/` - Create new section
- `GET /public-sections/` - List all sections
- `PATCH /public-sections/:id/` - Update section
- `DELETE /public-sections/:id/` - Delete section

### Hero Section
- `PATCH /hero-sections/:id/` - Update hero text
- `POST /hero-sections/:id/upload-hero-image/` - Upload background
- `POST /hero-sections/:id/upload-logo/` - Upload logo

### Gallery Section
- `POST /gallery-containers/` - Create gallery
- `GET /gallery-containers/?section=:id` - List galleries
- `PATCH /gallery-containers/:id/` - Update gallery
- `DELETE /gallery-containers/:id/` - Delete gallery
- `POST /gallery-images/bulk-upload/` - Upload images (max 20)
- `PATCH /gallery-images/:id/` - Update image caption
- `DELETE /gallery-images/:id/` - Delete image

### List Section
- `POST /list-containers/` - Create list
- `GET /list-containers/?section=:id` - List containers
- `POST /cards/` - Create card
- `PATCH /cards/:id/` - Update card
- `POST /cards/:id/upload-image/` - Upload card image
- `DELETE /cards/:id/` - Delete card

### News Section
- `POST /news-items/` - Create news item
- `GET /news-items/?section=:id` - List news items
- `PATCH /news-items/:id/` - Update news item
- `DELETE /news-items/:id/` - Delete news item
- `POST /content-blocks/` - Create content block
- `PATCH /content-blocks/:id/` - Update content block
- `POST /content-blocks/:id/upload-image/` - Upload block image
- `DELETE /content-blocks/:id/` - Delete content block

### Public View
- `GET /public/hotel/:slug/page/` - Get complete page data

## Usage

### For Super Admins

1. **Navigate to Section Editor**
   ```
   /staff/:hotelSlug/section-editor
   ```

2. **Create a Section**
   - Click "Add Section"
   - Choose section type (hero, gallery, list, news)
   - Enter section name
   - Click "Create Section"

3. **Manage Section Content**
   - **Hero**: Edit text, upload images
   - **Gallery**: Create galleries, upload images (bulk)
   - **List**: Create lists, add cards with images
   - **News**: Add news items, create text/image blocks

4. **Reorder Sections**
   - Drag the grip icon to reorder sections
   - Changes save automatically

5. **Toggle Section Visibility**
   - Click Active/Inactive button
   - Inactive sections won't show on public page

6. **Preview Public Page**
   - Click "Preview Page" button
   - Or visit `/hotel/:slug/sections`

### For Guests

Visit `/hotel/:slug/sections` to view the complete public page with all active sections.

## Components Reference

### SectionEditorPage
Main staff interface for managing all sections.

**Props**: None (uses URL params)

**Features**:
- Drag-and-drop section ordering
- Create/delete sections
- Toggle section visibility
- Renders appropriate editor for each section type

### Section Editor Components

#### HeroSectionEditor
```jsx
<HeroSectionEditor 
  section={section} 
  hotelSlug={hotelSlug}
  onUpdate={handleUpdate}
/>
```

#### GallerySectionEditor
```jsx
<GallerySectionEditor 
  section={section} 
  hotelSlug={hotelSlug}
  onUpdate={handleUpdate}
/>
```

#### ListSectionEditor
```jsx
<ListSectionEditor 
  section={section} 
  hotelSlug={hotelSlug}
  onUpdate={handleUpdate}
/>
```

#### NewsSectionEditor
```jsx
<NewsSectionEditor 
  section={section} 
  hotelSlug={hotelSlug}
  onUpdate={handleUpdate}
/>
```

### Public View Components

#### SectionBasedPublicPage
Main public-facing page that renders all sections.

**Features**:
- Fetches page data from backend
- Renders sections based on type
- Shows edit button for staff users
- Handles empty states gracefully

### Section View Components

#### HeroSectionView
Renders hero with background image, logo, title, and text.

#### GallerySectionView
Renders image galleries with lightbox functionality.

#### ListSectionView
Renders card grids with hover effects.

#### NewsSectionView
Renders news articles with mixed text/image content.

## Permissions

**Required**: `IsSuperStaffAdminForHotel` permission

Only super admins can:
- Access section editor
- Create/edit/delete sections
- Upload images
- Manage content

Guests can only view the public page (no authentication required).

## Dependencies

### New Dependencies Added
```json
{
  "@hello-pangea/dnd": "^16.x.x"  // Drag-and-drop functionality
}
```

### Existing Dependencies Used
- `react-bootstrap` - UI components
- `react-router-dom` - Routing
- `react-toastify` - Notifications
- `axios` - HTTP requests
- `@/services/api` - API client

## Image Handling

All images use **Cloudinary integration**:
- Max file size: 10MB per image
- Supported formats: JPEG, PNG, WebP
- Bulk upload: Max 20 images at once (galleries)
- Images stored via CloudinaryField in backend

## Error Handling

All operations include:
- Try-catch error handling
- Toast notifications for success/error
- Console logging for debugging
- User-friendly error messages

## Empty States

Each section type shows helpful empty states:
- **Hero**: Pre-populated with placeholder text
- **Gallery**: "No images yet" with upload button
- **List**: "No cards yet" with add button
- **News**: "No news yet" with add button

## Responsive Design

All components are mobile-responsive:
- Bootstrap grid system
- Mobile-optimized navigation
- Touch-friendly controls
- Responsive image galleries

## Testing the Implementation

### 1. Test Section Editor Access
```
Navigate to: /staff/:hotelSlug/section-editor
Expected: See section editor interface
```

### 2. Test Section Creation
```
1. Click "Add Section"
2. Select "hero" type
3. Enter name "Welcome Hero"
4. Click "Create Section"
Expected: New hero section appears with placeholder text
```

### 3. Test Image Uploads
```
1. In hero section, click "Choose File" for Hero Image
2. Select an image file
3. Wait for upload
Expected: Image appears below the file input
```

### 4. Test Drag-and-Drop
```
1. Create multiple sections
2. Drag a section by the grip icon
3. Drop in new position
Expected: Section order updates, toast confirms success
```

### 5. Test Public View
```
1. Create and populate sections in editor
2. Navigate to: /hotel/:slug/sections
Expected: All active sections render correctly
```

## Troubleshooting

### Issue: Drag-and-drop not working
**Solution**: Ensure `@hello-pangea/dnd` is installed correctly

### Issue: Images not uploading
**Solution**: 
- Check file size (max 10MB)
- Verify Cloudinary credentials in backend
- Check network tab for upload errors

### Issue: "Permission denied" error
**Solution**: User must have `IsSuperStaffAdminForHotel` permission

### Issue: Sections not appearing on public page
**Solution**: Check section is marked as "Active" in editor

## Future Enhancements

Potential improvements:
- [ ] Duplicate section functionality
- [ ] Section templates
- [ ] Undo/redo functionality
- [ ] Autosave drafts
- [ ] Preview mode within editor
- [ ] SEO metadata per section
- [ ] Animation/transition options
- [ ] Section-level permissions

## Performance Considerations

- Images are lazy-loaded in galleries
- Sections render only when active
- API calls minimized with proper state management
- Drag-and-drop uses optimistic updates

## Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Maintenance

Regular maintenance tasks:
1. Update dependencies monthly
2. Monitor Cloudinary storage usage
3. Review and optimize image sizes
4. Check for broken image links
5. Update documentation as needed

## Support

For issues or questions:
1. Check console for error messages
2. Verify API endpoints are accessible
3. Check user permissions
4. Review backend logs
5. Contact development team

---

**Implementation Status**: ✅ Complete

All features implemented according to `SECTION_EDITOR_API.md` specification.
