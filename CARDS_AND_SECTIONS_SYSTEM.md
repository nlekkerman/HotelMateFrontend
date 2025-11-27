# Cards & Sections System - Complete Guide

## Overview
HotelMate uses a **flexible section-based system** for building hotel public pages. Staff can create custom sections and add cards to them dynamically without code changes.

---

## 🏗️ Architecture

### Section Types
There are **4 main section types**:

1. **Hero Section** (`hero`) - Welcome banner with title, text, and images
2. **Gallery Section** (`gallery`) - Photo collections/galleries
3. **List/Cards Section** (`list`) - Card-based content (offers, facilities, services)
4. **News Section** (`news`) - Articles with text and images

---

## 📦 Data Structure

### Section Model
```javascript
{
  id: 1,
  section_type: "list",           // hero, gallery, list, news
  name: "Special Offers",         // Display name
  position: 0,                    // Order on page (drag-drop)
  is_active: true,                // Show/hide section
  created_at: "2025-11-27",
  updated_at: "2025-11-27",
  
  // Nested data based on section_type
  lists: [...],          // For list sections
  hero_data: {...},      // For hero sections
  galleries: [...],      // For gallery sections
  news_items: [...]      // For news sections
}
```

### List Container Model
```javascript
{
  id: 1,
  section: 1,                    // Parent section ID
  title: "Special Offers",       // List title
  sort_order: 0,                 // Order within section
  cards: [...]                   // Array of cards
}
```

### Card Model
```javascript
{
  id: 1,
  list_container: 1,            // Parent list ID
  title: "Weekend Discount",    // Card title
  subtitle: "Save 20%",         // Optional subtitle
  description: "Book now...",   // Optional description
  image_url: "https://...",     // Card image
  sort_order: 0,                // Order within list
  created_at: "2025-11-27",
  updated_at: "2025-11-27"
}
```

---

## 🎯 Section Editor Page

**Location:** `/staff/{hotelSlug}/section-editor`  
**File:** `src/pages/sections/SectionEditorPage.jsx`

### Features
- ✅ Create/delete sections
- ✅ Toggle section active/inactive
- ✅ Drag-and-drop reordering
- ✅ Type-specific editors
- ✅ Super admin only access
- ✅ Preview button

### How It Works

#### 1. Creating a Section
```javascript
const handleCreateSection = async () => {
  await createSection(hotelSlug, {
    section_type: 'list',           // Type selection
    name: 'Special Offers',         // Custom name
    position: sections.length,      // Auto position at end
  });
};
```

**Available Types:**
- `hero` - Pre-filled with placeholder text
- `gallery` - Empty, add galleries after creation
- `list` - Empty, add lists and cards after creation
- `news` - Empty, add articles after creation

#### 2. Drag-and-Drop Reordering
```javascript
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="sections">
    {sections.map((section, index) => (
      <Draggable 
        key={section.id} 
        draggableId={section.id.toString()} 
        index={index}
      >
        {/* Section card */}
      </Draggable>
    ))}
  </Droppable>
</DragDropContext>
```

**Saves immediately:**
```javascript
const handleDragEnd = async (result) => {
  // Update positions locally
  const updatedSections = items.map((item, index) => ({
    ...item,
    position: index,
  }));
  
  // Save to backend
  await Promise.all(
    updatedSections.map((section) =>
      updateSection(hotelSlug, section.id, { position: section.position })
    )
  );
};
```

#### 3. Type-Specific Editors
```javascript
const renderSectionEditor = (section) => {
  switch (section.section_type) {
    case 'hero':
      return <HeroSectionEditor section={section} />;
    case 'gallery':
      return <GallerySectionEditor section={section} />;
    case 'list':
      return <ListSectionEditor section={section} />;
    case 'news':
      return <NewsSectionEditor section={section} />;
  }
};
```

---

## 📝 List/Cards Section (Most Common)

### List Section Editor
**File:** `src/components/sections/ListSectionEditor.jsx`

### Two-Level Structure

#### Level 1: Lists (Containers)
- A section can have multiple lists
- Each list has a title (e.g., "Special Offers", "Facilities")
- Lists group related cards together

```javascript
const handleAddList = async () => {
  await createListContainer(hotelSlug, {
    section: section.id,
    title: 'Special Offers',
    sort_order: lists.length,
  });
};
```

#### Level 2: Cards
- Each list contains multiple cards
- Cards have title, subtitle, description, image
- Cards are the actual content displayed

```javascript
const handleSaveCard = async () => {
  await createCard(hotelSlug, {
    list_container: listId,
    title: 'Weekend Discount',
    subtitle: 'Save 20%',
    description: 'Book now and save 20% on weekend stays',
    sort_order: 0,
  });
  
  // Then upload image
  await uploadCardImage(hotelSlug, cardId, imageFile);
};
```

### Example Structure
```
Section: "Promotions"
  ├── List: "Special Offers"
  │   ├── Card: "Weekend Discount" (20% off)
  │   ├── Card: "Early Bird Special" (15% off)
  │   └── Card: "Long Stay Deal" (3 nights for 2)
  │
  └── List: "Package Deals"
      ├── Card: "Romantic Package" (dinner + room)
      ├── Card: "Family Package" (4 tickets + room)
      └── Card: "Business Package" (meeting room + lunch)
```

### UI in Editor
```jsx
<Card> {/* Section */}
  <Card.Header>List/Cards Section</Card.Header>
  <Card.Body>
    {lists.map(list => (
      <Card key={list.id}> {/* List Container */}
        <Card.Header>
          {list.title}
          <Button onClick={() => setShowAddCard(list.id)}>
            Add Card
          </Button>
        </Card.Header>
        <Card.Body>
          <Row>
            {list.cards.map(card => (
              <Col md={4} key={card.id}> {/* Individual Card */}
                <Card>
                  <Card.Img src={card.image_url} />
                  <Card.Body>
                    <Card.Title>{card.title}</Card.Title>
                    <Card.Subtitle>{card.subtitle}</Card.Subtitle>
                    <Card.Text>{card.description}</Card.Text>
                    <Button size="sm">Edit</Button>
                    <Button size="sm">Delete</Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    ))}
  </Card.Body>
</Card>
```

---

## 👁️ Public Section Rendering

### Public Page
**File:** `src/pages/sections/SectionBasedPublicPage.jsx`

### How Sections Are Rendered

```javascript
const renderSection = (section) => {
  // Skip inactive sections
  if (section.is_active === false) {
    return null;
  }

  switch (section.section_type) {
    case 'hero':
      return <HeroSectionView section={section} />;
    case 'gallery':
      return <GallerySectionView section={section} />;
    case 'list':
      return <ListSectionView section={section} />;
    case 'news':
      return <NewsSectionView section={section} />;
    default:
      return null;
  }
};

// In render
{pageData.sections.map(section => renderSection(section))}
```

### List Section View
**File:** `src/components/sections/ListSectionView.jsx`

**Public Display:**
```jsx
<section className="list-section-view py-5">
  <Container>
    <h2>{section.name}</h2>
    
    {lists.map(list => (
      <div key={list.id}>
        <h3>{list.title}</h3>
        
        <Row>
          {/* Add Card Placeholder (Staff Only) */}
          {isStaff && (
            <Col md={4}>
              <div className="placeholder-add-card" onClick={() => openAddCard(list)}>
                <i className="bi bi-plus-circle"></i>
                <p>Add Card</p>
              </div>
            </Col>
          )}
          
          {/* Existing Cards */}
          {list.cards.map(card => (
            <Col md={4} key={card.id}>
              <Card className="h-100 shadow-sm hover-lift">
                <Card.Img src={card.image_url} alt={card.title} />
                <Card.Body>
                  <Card.Title>{card.title}</Card.Title>
                  <Card.Subtitle>{card.subtitle}</Card.Subtitle>
                  <Card.Text>{card.description}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    ))}
  </Container>
</section>
```

### Inline Editing
Staff users see **"Add Card"** placeholders on the public page:

```jsx
{isStaff && (
  <div 
    className="placeholder-add-card" 
    onClick={() => openAddCard(list)}
  >
    <i className="bi bi-plus-circle"></i>
    <p>Add Card</p>
  </div>
)}
```

Clicking opens a modal to create cards directly from the public view!

---

## 🎨 Hero Section

### Hero Section Editor
**File:** `src/components/sections/HeroSectionEditor.jsx`

**Fields:**
- Hero Title (text)
- Hero Text (textarea)
- Hero Background Image (file upload)
- Hero Logo (file upload)

**Structure:**
```javascript
{
  hero_data: {
    id: 1,
    hero_title: "Welcome to Hotel Killarney",
    hero_text: "Experience luxury in the heart of Ireland",
    hero_image_url: "https://cloudinary.com/.../hero.jpg",
    hero_logo_url: "https://cloudinary.com/.../logo.png"
  }
}
```

**Upload Flow:**
```javascript
const handleImageUpload = async (file) => {
  await uploadHeroImage(hotelSlug, heroData.id, file);
  // Backend uploads to Cloudinary
  // Returns updated hero_image_url
};
```

---

## 🖼️ Gallery Section

### Gallery Section Editor
**File:** `src/components/sections/GallerySectionEditor.jsx`

**Two-Level Structure:**

1. **Galleries** - Collections of photos (e.g., "Rooms", "Restaurant", "Spa")
2. **Photos** - Individual images within each gallery

**Example:**
```
Section: "Photo Gallery"
  ├── Gallery: "Rooms & Suites"
  │   ├── Photo: Deluxe Room
  │   ├── Photo: Family Suite
  │   └── Photo: Presidential Suite
  │
  ├── Gallery: "Restaurant"
  │   ├── Photo: Main Dining
  │   ├── Photo: Bar Area
  │   └── Photo: Terrace
  │
  └── Gallery: "Facilities"
      ├── Photo: Spa
      ├── Photo: Gym
      └── Photo: Pool
```

---

## 📰 News Section

### News Section Editor
**File:** `src/components/sections/NewsSectionEditor.jsx`

**News Item Model:**
```javascript
{
  id: 1,
  section: 1,
  title: "New Spa Opening",
  content: "We're excited to announce...",
  image_url: "https://...",
  published_date: "2025-11-27",
  sort_order: 0
}
```

---

## 🔌 API Service Layer

**File:** `src/services/sectionEditorApi.js`

### Section Management
```javascript
// List all sections
listSections(hotelSlug)
// GET /staff/hotel/{slug}/sections/

// Create section
createSection(hotelSlug, data)
// POST /staff/hotel/{slug}/sections/
// Body: { section_type, name, position }

// Update section
updateSection(hotelSlug, sectionId, data)
// PATCH /staff/hotel/{slug}/sections/{id}/

// Delete section
deleteSection(hotelSlug, sectionId)
// DELETE /staff/hotel/{slug}/sections/{id}/
```

### List Container Management
```javascript
// Create list
createListContainer(hotelSlug, data)
// POST /staff/hotel/{slug}/list-containers/
// Body: { section, title, sort_order }

// Update list
updateListContainer(hotelSlug, listId, data)
// PATCH /staff/hotel/{slug}/list-containers/{id}/

// Delete list
deleteListContainer(hotelSlug, listId)
// DELETE /staff/hotel/{slug}/list-containers/{id}/
```

### Card Management
```javascript
// Create card
createCard(hotelSlug, data)
// POST /staff/hotel/{slug}/cards/
// Body: { list_container, title, subtitle, description, sort_order }

// Update card
updateCard(hotelSlug, cardId, data)
// PATCH /staff/hotel/{slug}/cards/{id}/

// Upload card image
uploadCardImage(hotelSlug, cardId, file)
// POST /staff/hotel/{slug}/cards/{id}/upload-image/
// Form data: { photo: file }

// Delete card
deleteCard(hotelSlug, cardId)
// DELETE /staff/hotel/{slug}/cards/{id}/
```

### Public API
```javascript
// Get public page with sections
getPublicHotelPage(hotelSlug)
// GET /hotel/public/page/{slug}/
```

---

## 🎨 Styling

**File:** `src/styles/sections.css`

### Card Hover Effects
```css
.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
```

### Add Card Placeholder
```css
.placeholder-add-card {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.placeholder-add-card:hover {
  border-color: #0d6efd;
  background-color: rgba(13, 110, 253, 0.05);
}

.placeholder-add-card i {
  font-size: 3rem;
  color: #6c757d;
}
```

---

## 🔐 Permissions

### Access Control
```javascript
const { isSuperStaffAdmin } = usePermissions();

// Section Editor - Super Admin Only
useEffect(() => {
  if (!isSuperStaffAdmin) {
    toast.error('You do not have permission');
    navigate(`/${hotelSlug}`);
    return;
  }
}, [isSuperStaffAdmin]);

// Inline Editing - Any Staff
const { isStaff } = useAuth();

{isStaff && (
  <Button>Edit Sections</Button>
)}
```

---

## 📊 Complete Flow Example

### Creating a "Special Offers" Section with Cards

#### Step 1: Create Section
```
1. Navigate to /staff/hotel-killarney/section-editor
2. Click "Add Section"
3. Select type: "List/Cards"
4. Enter name: "Special Offers"
5. Click "Create Section"
```

#### Step 2: Add List Container
```
1. In new section, click "Add List"
2. Enter title: "Weekend Deals"
3. Click "Add List"
```

#### Step 3: Add Cards
```
For each offer:
1. Click "Add Card" in list header
2. Fill form:
   - Title: "20% Off Weekends"
   - Subtitle: "Friday-Sunday Special"
   - Description: "Book any weekend stay and save 20%..."
3. Upload image
4. Click "Save Card"
```

#### Step 4: Activate Section
```
1. Toggle section to "Active"
2. Drag to desired position
3. Click "Preview Page"
```

#### Result on Public Page:
```
┌──────────────────────────────────────────┐
│         Special Offers                   │
│                                          │
│    Weekend Deals                         │
│    ┌────────┐  ┌────────┐  ┌────────┐ │
│    │  [+]   │  │ 20% Off│  │ Early  │ │
│    │  Add   │  │Weekend │  │ Bird   │ │
│    │  Card  │  │ ...    │  │ ...    │ │
│    └────────┘  └────────┘  └────────┘ │
└──────────────────────────────────────────┘
```

---

## 🚀 Advanced Features

### Inline Add Card Hook
**File:** `src/hooks/useListSectionActions.jsx`

```javascript
export const useListSectionActions = (slug, section, onUpdate) => {
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [cardForm, setCardForm] = useState({ title: '', subtitle: '', description: '' });
  const [cardImage, setCardImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const openAddCard = (list) => {
    setSelectedList(list);
    setShowAddCard(true);
  };

  const handleCreateCard = async () => {
    // Create card
    const card = await createCard(slug, {
      list_container: selectedList.id,
      ...cardForm
    });
    
    // Upload image if provided
    if (cardImage) {
      await uploadCardImage(slug, card.id, cardImage);
    }
    
    toast.success('Card created!');
    closeCardModal();
    onUpdate();
  };

  return { showAddCard, selectedList, cardForm, setCardForm, handleCreateCard, openAddCard };
};
```

### Drag Handle
```jsx
<div {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
  <i className="bi bi-grip-vertical"></i>
</div>
```

### Section Icons
```javascript
const getSectionIcon = (type) => {
  switch (type) {
    case 'hero': return 'bi-star';
    case 'gallery': return 'bi-images';
    case 'list': return 'bi-card-list';
    case 'news': return 'bi-newspaper';
    default: return 'bi-question-circle';
  }
};
```

---

## ✅ What's Implemented

### Section Editor
- ✅ Create/delete sections
- ✅ Drag-and-drop reordering
- ✅ Toggle active/inactive
- ✅ Type-specific editors
- ✅ Super admin access control

### List/Cards System
- ✅ Create/delete list containers
- ✅ Create/update/delete cards
- ✅ Image upload for cards
- ✅ Inline editing on public page (staff only)
- ✅ Add card placeholders
- ✅ Modal forms

### Hero Section
- ✅ Title and text editing
- ✅ Background image upload
- ✅ Logo upload
- ✅ Cloudinary integration

### Gallery Section
- ✅ Multiple galleries per section
- ✅ Photo upload and management
- ✅ Gallery grouping

### News Section
- ✅ Article creation
- ✅ Image upload
- ✅ Published date tracking

### Public Rendering
- ✅ Section-based page rendering
- ✅ Active/inactive filtering
- ✅ Position-based ordering
- ✅ Responsive card grids
- ✅ Staff-only features

---

## 🐛 Testing Checklist

### Section Management
- [ ] Can create all section types
- [ ] Can drag-drop reorder sections
- [ ] Can toggle active/inactive
- [ ] Can delete sections
- [ ] Position numbers update correctly

### List/Cards
- [ ] Can add list container
- [ ] Can add cards to list
- [ ] Can edit card content
- [ ] Can upload card images
- [ ] Can delete cards
- [ ] Can delete lists

### Public Display
- [ ] Sections render in correct order
- [ ] Inactive sections hidden
- [ ] Cards display properly
- [ ] Images load correctly
- [ ] Responsive on mobile

### Permissions
- [ ] Non-staff cannot access editor
- [ ] Staff see edit buttons on public page
- [ ] Super admin can access all features

---

## 📝 Notes

### Card vs Section Confusion
- **Section** = Container for content type (hero, gallery, list, news)
- **List** = Grouping within a list section (e.g., "Special Offers")
- **Card** = Individual content item (e.g., "20% Off Weekend")

### Why Two Levels?
Lists allow grouping related cards:
- Section: "What We Offer"
  - List: "Accommodation" (room cards)
  - List: "Dining" (restaurant cards)
  - List: "Activities" (activity cards)

### Flexibility
- One hotel might use: 1 hero + 1 gallery + 1 list with 20 cards
- Another might use: 3 heroes + 5 galleries + 10 lists with 5 cards each
- Completely customizable per hotel!

---

**Last Updated:** November 27, 2025  
**Status:** ✅ Fully Implemented & Working
