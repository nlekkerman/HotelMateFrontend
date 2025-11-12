# Custom Icons System

## Overview
Centralized management for all custom navigation and UI icons.

## File Structure
```
src/
├── assets/
│   └── icons/
│       ├── home-icon.png          ✅ Added
│       ├── dashboard-icon.png     ⏳ Add here
│       ├── bookings-icon.png      ⏳ Add here
│       └── ... (more icons)
├── config/
│   └── customIcons.js             ✅ Icon registry
└── components/
    └── utils/
        └── CustomIcon.jsx         ✅ Icon component
```

## How to Add New Icons

### Step 1: Add Icon to Assets
Place your PNG/SVG icon in `src/assets/icons/`

### Step 2: Register in customIcons.js
```javascript
// src/config/customIcons.js
import homeIcon from "@/assets/icons/home-icon.png";
import dashboardIcon from "@/assets/icons/dashboard-icon.png"; // ← Add import
import bookingsIcon from "@/assets/icons/bookings-icon.png";   // ← Add import

export const customIcons = {
  home: homeIcon,
  dashboard: dashboardIcon,  // ← Register here
  bookings: bookingsIcon,    // ← Register here
  // Add more...
};
```

### Step 3: Use in Components
```jsx
import CustomIcon from "@/components/utils/CustomIcon";

// Simple usage
<CustomIcon name="home" size={32} />

// With click handler
<CustomIcon 
  name="dashboard" 
  size={40} 
  onClick={() => navigate('/dashboard')}
/>

// With custom styling
<CustomIcon 
  name="bookings" 
  size={24}
  className="my-custom-class"
  style={{ filter: 'brightness(1.2)' }}
/>
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | string | - | **Required.** Icon name from registry |
| `size` | number/string | 24 | Icon dimensions (px) |
| `alt` | string | name | Alt text for accessibility |
| `className` | string | "" | Additional CSS classes |
| `style` | object | {} | Inline styles |
| `onClick` | function | - | Click handler |

## Examples

### Navigation Icon
```jsx
<CustomIcon 
  name="home" 
  size={48}
  onClick={() => navigate('/')}
  alt="Go to Home"
/>
```

### Badge with Icon
```jsx
<div className="nav-item">
  <CustomIcon name="bookings" size={32} />
  {count > 0 && <span className="badge">{count}</span>}
</div>
```

### Themed Icon
```jsx
<CustomIcon 
  name="dashboard"
  size={40}
  style={{ 
    filter: `drop-shadow(0 0 5px ${mainColor})`,
    opacity: isActive ? 1 : 0.6 
  }}
/>
```

## Suggested Icon Names

When you provide new icons, use these consistent names:

- ✅ `home` - Home/Dashboard
- ⏳ `dashboard` - Main dashboard
- ⏳ `bookings` - Bookings/Reservations
- ⏳ `rooms` - Rooms management
- ⏳ `restaurant` - Restaurant/Dining
- ⏳ `staff` - Staff management
- ⏳ `chat` - Messaging/Chat
- ⏳ `settings` - Settings/Configuration
- ⏳ `analytics` - Analytics/Reports
- ⏳ `maintenance` - Maintenance/Tasks
- ⏳ `guests` - Guest management
- ⏳ `calendar` - Calendar/Schedule
- ⏳ `notifications` - Notifications
- ⏳ `profile` - User profile
- ⏳ `logout` - Logout/Exit
- ⏳ `menu` - Menu/Navigation

## Next Steps

1. **Provide icon files** - Share all icon PNGs/SVGs
2. **I'll register them** - Add to `customIcons.js`
3. **Update navigation** - Replace Bootstrap icons with custom icons
4. **Apply throughout app** - Consistent branding everywhere

## Benefits

✅ Centralized icon management  
✅ Easy to swap icons  
✅ Consistent sizing and styling  
✅ Type-safe with helper functions  
✅ Lazy loading support  
✅ No more scattered imports  

---

**Ready to add icons!** Just paste the icon names and I'll update the system.
