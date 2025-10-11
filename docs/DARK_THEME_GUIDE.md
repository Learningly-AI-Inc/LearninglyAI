# Dark Theme Implementation Guide

## Overview
This guide documents the comprehensive dark theme implementation for the Learningly AI platform. The dark theme provides a modern, professional appearance that reduces eye strain and improves readability in low-light conditions.

## Features Implemented

### 1. Theme Provider System
- **Location**: `components/theme-provider.tsx`
- **Features**:
  - React Context-based theme management
  - Support for three modes: `light`, `dark`, and `system`
  - Automatic system preference detection
  - LocalStorage persistence
  - No flash of unstyled content (FOUC) prevention

### 2. Theme Switching
- **Settings Page**: `app/(app)/settings/page.tsx`
- Users can switch between Light, Dark, and System themes
- Changes persist across sessions
- Instant theme switching with smooth transitions

### 3. Color System
- **Location**: `app/globals.css`
- CSS custom properties for all theme colors
- Semantic color naming (background, foreground, primary, etc.)
- Comprehensive dark mode color palette

#### Key Color Variables

**Light Mode**:
- Background: `hsl(0 0% 99%)`
- Foreground: `hsl(222 84% 4.9%)`
- Card: `hsl(0 0% 100%)`
- Muted: `hsl(210 40% 96%)`

**Dark Mode**:
- Background: `hsl(222 47% 11%)`
- Foreground: `hsl(213 31% 91%)`
- Card: `hsl(224 71% 4%)`
- Muted: `hsl(223 47% 15%)`

### 4. Updated Components

#### Core UI Components
- ✅ **Card** - Uses semantic colors (bg-card, border-border)
- ✅ **Input** - Full dark mode support with proper borders and text colors
- ✅ **Button** - Already using theme variables
- ✅ **Toast** - Dark mode variants for all notification types
- ✅ **Header** - Using semantic foreground colors

#### Layout Components
- ✅ **App Layout** - Background colors updated to use theme variables
- ✅ **Sidebar** - Comprehensive dark mode support with proper hover states
- ✅ **Mobile Menu** - Dark mode compatible

#### Feature Components
- ✅ **Settings Page** - Full theme management interface
- ⚠️ **Landing Page** - Already has dark aesthetic, may need minor adjustments
- ⚠️ **Reading/Writing/Exam Prep** - Core functionality works, specific components may need refinement

### 5. Syntax Highlighting
- **Location**: `app/globals.css` (lines 208-284)
- Custom syntax highlighting for both light and dark modes
- GitHub-inspired color scheme
- Proper contrast ratios for readability

### 6. FOUC Prevention
- **Location**: `app/layout.tsx` (inline script in head)
- Blocking script loads theme before first paint
- Checks localStorage and system preferences
- Applies dark class to HTML root element immediately

## Usage

### For Users
1. Navigate to Settings page
2. Find the "Appearance" section
3. Select your preferred theme:
   - **Light**: Always use light mode
   - **Dark**: Always use dark mode
   - **System**: Follow system preferences

### For Developers

#### Using Theme in Components
```tsx
import { useTheme } from "@/components/theme-provider"

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  // theme: 'light' | 'dark' | 'system' (user setting)
  // resolvedTheme: 'light' | 'dark' (actual theme being displayed)
  
  return (
    <button onClick={() => setTheme('dark')}>
      Switch to Dark Mode
    </button>
  )
}
```

#### Using Theme Colors in Tailwind
Always use semantic color classes instead of hardcoded colors:

**Good ✅**:
```tsx
<div className="bg-background text-foreground">
<div className="bg-card border-border">
<p className="text-muted-foreground">
```

**Bad ❌**:
```tsx
<div className="bg-white text-black">
<div className="bg-gray-100 border-gray-200">
<p className="text-gray-600">
```

#### Dark Mode Specific Styles
Use the `dark:` modifier when needed:
```tsx
<div className="bg-white dark:bg-gray-900">
<p className="text-gray-900 dark:text-gray-100">
```

## Color Palette Reference

### Semantic Colors
- `background` - Main background color
- `foreground` - Main text color
- `card` - Card background
- `card-foreground` - Card text
- `primary` - Primary brand color
- `primary-foreground` - Text on primary color
- `secondary` - Secondary elements
- `muted` - Muted/subtle elements
- `accent` - Accent/highlight color
- `destructive` - Error/danger color
- `border` - Border color
- `input` - Input field backgrounds
- `ring` - Focus ring color

### Usage in Tailwind
All semantic colors are available as Tailwind utilities:
- `bg-{color}` - Background
- `text-{color}` - Text
- `border-{color}` - Borders

## Best Practices

### 1. Always Use Semantic Colors
Use the CSS custom properties/semantic colors defined in the theme system rather than hardcoding specific colors.

### 2. Test in Both Modes
Always test your components in both light and dark modes to ensure proper contrast and readability.

### 3. Consider Color Blindness
Use multiple visual cues (not just color) for important information.

### 4. Maintain Contrast
Ensure sufficient contrast ratios:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: Clear visual feedback

### 5. Avoid Pure Black/White in Dark Mode
Dark mode uses `hsl(222 47% 11%)` instead of pure black for better eye comfort.

## Known Issues & Future Improvements

### Current Limitations
1. **Landing Page**: Has specific dark aesthetic, may need coordination with theme system
2. **Some Feature Pages**: Reading, Writing, Exam Prep pages may have components with hardcoded colors
3. **Image Backgrounds**: Some decorative elements may need dark mode variants

### Future Enhancements
1. Add transition animations when switching themes
2. Create dark mode variants for all illustrations/graphics
3. Add per-page theme overrides if needed
4. Implement theme-aware PDF viewer
5. Add color customization options (allow users to pick accent colors)

## Technical Details

### Theme Persistence Flow
1. User selects theme in Settings
2. Theme saved to localStorage (`learningly-theme`)
3. ThemeProvider updates context
4. React re-renders with new theme class
5. On page load, inline script reads localStorage and applies theme before paint

### System Preference Detection
```javascript
window.matchMedia('(prefers-color-scheme: dark)').matches
```

### CSS Cascade
1. CSS custom properties defined in `:root` (light mode)
2. Dark mode properties override in `.dark` selector
3. Tailwind utilities reference these properties
4. Components use Tailwind utilities or custom properties

## Troubleshooting

### Theme Not Persisting
- Check browser localStorage is enabled
- Verify localStorage key is `learningly-theme`

### Flash of Wrong Theme (FOUC)
- Ensure inline script in `app/layout.tsx` is present
- Check that `suppressHydrationWarning` is set on html/body elements

### Colors Not Updating
- Verify component is using semantic colors (not hardcoded)
- Check that Tailwind classes are correct
- Clear build cache and restart dev server

### Dark Mode Not Working in Component
- Ensure component is within ThemeProvider
- Check CSS specificity (hardcoded styles may override theme)
- Verify Tailwind configuration includes dark mode class strategy

## Resources
- [Tailwind Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)
- [Next.js Themes](https://nextjs.org/docs/app/building-your-application/styling/css-variables)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

## Maintenance
When adding new components:
1. Use semantic color variables
2. Test in both light and dark modes
3. Ensure proper contrast ratios
4. Document any theme-specific behavior
5. Update this guide if adding new theme features

