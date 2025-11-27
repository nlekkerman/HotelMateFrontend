# Theme System Usage Guide

## Overview
The theme system is now integrated with React Context and available throughout the entire application. Staff can customize theme colors through the Settings page, and all components can access and use these colors.

## How It Works

### 1. Theme Context Provider
The `ThemeProvider` is already wrapped around the entire app in `App.jsx`:
```jsx
<ThemeProvider>
  {/* Your app components */}
</ThemeProvider>
```

### 2. Using Theme in Components

#### Method 1: Using the useTheme Hook (Recommended)
```jsx
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { 
    mainColor, 
    secondaryColor, 
    buttonColor, 
    themeLoading 
  } = useTheme();

  if (themeLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ color: mainColor }}>My Title</h1>
      <button style={{ backgroundColor: buttonColor }}>Click Me</button>
    </div>
  );
}
```

#### Method 2: Using CSS Variables (Best for Styling)
CSS variables are automatically set when the theme loads. Use them in your CSS:

```css
/* In your component's CSS or inline styles */
.my-header {
  color: var(--main-color);
  background: var(--background-color);
  border: 1px solid var(--border-color);
}

.my-button {
  background-color: var(--button-color);
  color: var(--button-text-color);
}

.my-button:hover {
  background-color: var(--button-hover-color);
}

.my-link {
  color: var(--link-color);
}

.my-link:hover {
  color: var(--link-hover-color);
}
```

### 3. Available Theme Properties

From `useTheme()` hook:
- `mainColor` - Primary brand color
- `secondaryColor` - Secondary accent color
- `backgroundColor` - Main background color
- `textColor` - Default text color
- `borderColor` - Default border color
- `buttonColor` - Button background color
- `buttonTextColor` - Button text color
- `buttonHoverColor` - Button hover state color
- `linkColor` - Default link color
- `linkHoverColor` - Link hover color
- `themeLoading` - Boolean indicating if theme is loading
- `settings` - Full settings object from API
- `updateTheme(updates)` - Function to update theme (staff only)
- `refetchTheme()` - Function to manually refresh theme

CSS Variables:
- `--main-color` / `--primary-color`
- `--secondary-color`
- `--background-color`
- `--text-color`
- `--border-color`
- `--button-color`
- `--button-text-color`
- `--button-hover-color`
- `--link-color`
- `--link-hover-color`

## Examples

### Example 1: Themed Card Component
```jsx
import { useTheme } from '@/context/ThemeContext';

function ThemedCard({ title, children }) {
  const { mainColor, borderColor, backgroundColor } = useTheme();

  return (
    <div style={{
      border: `2px solid ${borderColor}`,
      backgroundColor: backgroundColor,
      borderRadius: '8px',
      padding: '20px'
    }}>
      <h3 style={{ color: mainColor }}>{title}</h3>
      {children}
    </div>
  );
}
```

### Example 2: Using CSS Variables in Styled Component
```jsx
function MyStyledComponent() {
  return (
    <div className="themed-container">
      <h1>Welcome</h1>
      <button className="themed-button">Action</button>
    </div>
  );
}

// CSS:
// .themed-container {
//   background: var(--background-color);
//   color: var(--text-color);
//   border: 1px solid var(--border-color);
// }
//
// .themed-button {
//   background: var(--button-color);
//   color: var(--button-text-color);
//   border: none;
//   padding: 10px 20px;
//   border-radius: 5px;
// }
//
// .themed-button:hover {
//   background: var(--button-hover-color);
// }
```

### Example 3: Updating Theme (Staff Only)
```jsx
import { useTheme } from '@/context/ThemeContext';

function ThemeEditor() {
  const { mainColor, updateTheme } = useTheme();
  const [newColor, setNewColor] = useState(mainColor);

  const handleSave = async () => {
    try {
      await updateTheme({
        main_color: newColor
      });
      alert('Theme updated!');
    } catch (error) {
      alert('Failed to update theme');
    }
  };

  return (
    <div>
      <input 
        type="color" 
        value={newColor} 
        onChange={(e) => setNewColor(e.target.value)} 
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### Example 4: Using with Bootstrap Components
```jsx
import { Button } from 'react-bootstrap';
import { useTheme } from '@/context/ThemeContext';

function ThemedBootstrapButton() {
  const { buttonColor, buttonTextColor, buttonHoverColor } = useTheme();

  return (
    <Button
      style={{
        backgroundColor: buttonColor,
        color: buttonTextColor,
        borderColor: buttonColor
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = buttonHoverColor;
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = buttonColor;
      }}
    >
      Click Me
    </Button>
  );
}
```

## Staff Settings

Staff members can customize the theme through:
1. Navigate to Settings page
2. Find "Theme Settings" section at the top
3. Use color pickers to adjust colors
4. Preview changes in real-time
5. Click "Save Theme" to apply permanently

## How Theme Loads

1. App starts → ThemeProvider fetches settings from API
2. For staff: Uses `/api/staff/hotel/{slug}/settings/`
3. For guests: Uses `/api/public/hotels/{slug}/settings/`
4. Theme colors are applied as CSS variables
5. Components can access theme via `useTheme()` hook
6. Theme persists across page navigation
7. Theme updates trigger re-render of components using the hook

## Benefits

✅ **Centralized** - One source of truth for all theme colors
✅ **Reactive** - Components automatically update when theme changes
✅ **Type-Safe** - TypeScript support with proper types
✅ **Performance** - CSS variables for instant styling updates
✅ **Flexible** - Use either hook or CSS variables based on needs
✅ **Staff Control** - Easy UI for staff to customize appearance
