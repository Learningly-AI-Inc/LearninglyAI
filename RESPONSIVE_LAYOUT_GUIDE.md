# Responsive Layout Guide - Reader Page

## Overview

This document outlines the comprehensive UI redesign implemented for the Reader page, focusing on responsive design, improved user experience, and better mobile support.

## Breakpoints & Layout

### Breakpoints
- **xl**: ≥1280px (Desktop)
- **md**: 768–1279px (Tablet) 
- **<md**: <768px (Mobile)

### Desktop (≥1280px)
- **Left Sidebar**: 72px collapsed (icons only) by default
- **Main Column**: PDF Viewer (flex-1)
- **Right Panel**: 360px, tabbed drawer (Chat | Flashcards | Summary)
- **Header Tabs**: Simplified to "Document" | "Summary"

### Tablet (768–1279px)
- **Left Sidebar**: Hidden, accessible via hamburger menu
- **Right Panel**: Overlay drawer from right (80vw width)
- **Main Column**: PDF full width minus left icons

### Mobile (<768px)
- **Left Sidebar**: Hidden, accessible via hamburger menu
- **Right Panel**: Bottom drawer (65vh height) with swipe-to-dismiss
- **PDF**: Full width with touch-friendly toolbar

## Key Features Implemented

### 1. Responsive Grid Layout
```tsx
<div className="grid min-h-screen grid-cols-[auto_1fr] xl:grid-cols-[72px_minmax(0,1fr)_360px]">
```

### 2. Unified Content Actions
- Single "Add content" button across all breakpoints
- Mobile FAB (Floating Action Button) for small screens
- Consistent entry point for upload/paste/record actions

### 3. Context-Aware Chat Interface
- Dynamic messaging based on document state
- Quick action chips for common tasks
- Proper empty states with helpful guidance

### 4. Drawer System
- Desktop: Collapsible sidebar (360px width)
- Tablet: Right overlay drawer (80vw width)
- Mobile: Bottom drawer (65vh height)

### 5. Keyboard Shortcuts
- `Ctrl+F`: Focus Mode (hides sidebars)
- `Ctrl+C`: Toggle Chat drawer

## Component Architecture

### Main Components
1. **`ReadingPage`** - Landing page with content upload options
2. **`DocumentViewer`** - Main PDF viewer with responsive layout
3. **`RightDrawer`** - Reusable drawer component for chat/flashcards/summary
4. **`ChatInterface`** - Context-aware chat with quick actions

### Layout Structure
```
ReadingPage
├── Header (with mobile hamburger)
├── Left Sidebar (desktop only)
│   ├── Add Content Button
│   └── History Section
├── Main Content
│   ├── Empty State (when no document)
│   └── Content Upload Options
└── Mobile FAB

DocumentViewer
├── Header (with view mode tabs)
├── PDF Area
├── Right Drawer (desktop)
└── Mobile/Tablet Drawer Overlay
```

## Accessibility Features

### WCAG AA Compliance
- All interactive elements ≥44px tap target
- Proper contrast ratios
- Focus states for all controls
- Screen reader labels

### Keyboard Navigation
- Tab navigation through all interactive elements
- Keyboard shortcuts for common actions
- Escape key to close drawers

## Performance Optimizations

### Lazy Loading
- Right drawer content loads on demand
- PDF rendering optimized for 60fps
- Deferred non-critical panels

### Smooth Animations
- 150-200ms ease-out transitions
- No layout shift when panels open/close
- Hardware-accelerated transforms

## Mobile-Specific Features

### Touch-Friendly Design
- Large tap targets (≥44px)
- Swipe gestures for drawer dismissal
- Touch-optimized PDF controls

### Responsive Typography
- Scalable text sizes
- Proper line heights for readability
- Optimized spacing for small screens

## State Management

### Document Context
- Global document state
- Chat history persistence
- Loading states and error handling

### UI State
- Drawer open/close states
- View mode (document/summary)
- Focus mode toggle

## Testing Checklist

### Desktop (≥1280px)
- [ ] PDF uses ≥70% width with right drawer closed
- [ ] Right drawer opens to 360px width
- [ ] Left sidebar collapses to icons only
- [ ] Tabs show "Document | Summary" only
- [ ] Keyboard shortcuts work

### Tablet (768–1279px)
- [ ] Right drawer overlays at 80vw width
- [ ] PDF remains full width behind drawer
- [ ] FAB visible and functional
- [ ] Touch interactions work properly

### Mobile (<768px)
- [ ] Hamburger menu opens sidebar overlay
- [ ] Chat opens as bottom drawer (65vh)
- [ ] PDF toolbar icons are touch-friendly
- [ ] Swipe-to-dismiss works on drawer

## Future Enhancements

### Planned Features
1. **Gesture Support**: Pinch-to-zoom on PDF
2. **Offline Support**: Cached document viewing
3. **Advanced Search**: Full-text search within documents
4. **Collaboration**: Shared document annotations
5. **Accessibility**: Voice commands and screen reader improvements

### Performance Improvements
1. **Virtual Scrolling**: For large document lists
2. **Image Optimization**: WebP format support
3. **Service Worker**: Offline caching
4. **Code Splitting**: Lazy load non-critical features

## Troubleshooting

### Common Issues
1. **Drawer not opening**: Check z-index and positioning
2. **PDF not loading**: Verify file path and CORS settings
3. **Mobile layout issues**: Check viewport meta tag
4. **Keyboard shortcuts not working**: Ensure focus is on correct element

### Debug Tools
- Browser dev tools responsive mode
- React DevTools for state inspection
- Performance profiling for animations
- Accessibility audit tools

## Code Standards

### Naming Conventions
- Components: PascalCase
- Files: kebab-case
- CSS classes: Tailwind utility classes
- Variables: camelCase

### File Structure
```
components/reading/
├── document-viewer.tsx
├── right-drawer.tsx
├── chat-interface.tsx
├── file-uploader.tsx
└── document-context.tsx
```

### Best Practices
- Use TypeScript for type safety
- Implement proper error boundaries
- Follow React hooks best practices
- Maintain consistent component interfaces
