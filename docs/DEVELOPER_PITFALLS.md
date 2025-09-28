# 🚨 Developer Pitfalls: What NOT to Do

## Writing Assistant Development - Lessons Learned

This document outlines critical mistakes to avoid when developing React/Next.js applications, based on real issues encountered during the Writing Assistant implementation.

---

## 1. 🔥 SSR/Client-Side Rendering Issues

### ❌ **DON'T: Use Browser APIs Directly in Components**

```javascript
// ❌ WRONG - Will break SSR
const handleTextSelection = () => {
  const selection = window.getSelection(); // Error: window is not defined
  // ...
}

useEffect(() => {
  document.addEventListener('selectionchange', handler); // Error: document is not defined
}, []);
```

### ✅ **DO: Always Guard Browser APIs**

```javascript
// ✅ CORRECT - SSR Safe
const handleTextSelection = () => {
  if (typeof window === 'undefined') return; // SSR guard
  
  const selection = window.getSelection();
  // ...
}

useEffect(() => {
  if (typeof document === 'undefined') return; // SSR guard
  
  document.addEventListener('selectionchange', handler);
  
  return () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('selectionchange', handler);
    }
  };
}, []);
```

### ❌ **DON'T: Try to Fix SSR Issues with Hacky Solutions**

```javascript
// ❌ WRONG - Trying to patch SSR issues
const isClient = typeof window !== 'undefined';
if (isClient) {
  // Still problematic during build
}
```

### ✅ **DO: Use Dynamic Imports for Client-Heavy Components**

```javascript
// ✅ CORRECT - Client-side only rendering
const ClientOnlyComponent = dynamic(() => import('./ClientComponent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});
```

---

## 2. 🔄 Next.js Version Migration Issues

### ❌ **DON'T: Ignore Breaking Changes in Route Parameters**

```javascript
// ❌ WRONG - Next.js 14 syntax that breaks in 15
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params; // Error in Next.js 15
}
```

### ✅ **DO: Update to Async Route Parameters**

```javascript
// ✅ CORRECT - Next.js 15 syntax
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Await the params
}
```

### 📋 **Migration Checklist:**
- [ ] Update all dynamic route handlers
- [ ] Add `await` to params destructuring
- [ ] Update TypeScript types for params
- [ ] Test all API routes after migration

---

## 3. 🎯 Event Handling & TypeScript Issues

### ❌ **DON'T: Pass Functions Directly Without Proper Typing**

```javascript
// ❌ WRONG - TypeScript error
<Button onClick={onReject}>Reject</Button>

// Where onReject: (issueId?: string) => void
// But onClick expects: (event: MouseEvent) => void
```

### ✅ **DO: Wrap Functions in Arrow Functions**

```javascript
// ✅ CORRECT - Proper event handling
<Button onClick={() => onReject()}>Reject</Button>
<Button onClick={() => onReject(issue.id)}>Reject Issue</Button>
```

---

## 4. 🖱️ Text Selection & User Interaction Issues

### ❌ **DON'T: Clear Selection Immediately on Events**

```javascript
// ❌ WRONG - Selection lost before button handler
const handleTextSelection = () => {
  const selection = window.getSelection();
  if (selection && selection.toString()) {
    setSelectedText(selection.toString());
  } else {
    setSelectedText(""); // Clears too aggressively
  }
};

// Event fires on button click, clearing selection
document.addEventListener('mouseup', handleTextSelection);
```

### ✅ **DO: Use Backup Mechanisms and Delays**

```javascript
// ✅ CORRECT - Preserve selection for user actions
const [selectedText, setSelectedText] = useState("");
const [lastSelectedText, setLastSelectedText] = useState(""); // Backup

const handleTextSelection = () => {
  if (typeof window === 'undefined') return;
  
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    const text = selection.toString().trim();
    setSelectedText(text);
    setLastSelectedText(text); // Keep backup
  }
  // Don't clear immediately
};

// Use selection change event with delay
useEffect(() => {
  if (typeof document === 'undefined') return;
  
  const handleSelectionWithDelay = () => {
    setTimeout(handleTextSelection, 100); // Delay prevents conflicts
  };
  
  document.addEventListener('selectionchange', handleSelectionWithDelay);
  
  return () => {
    document.removeEventListener('selectionchange', handleSelectionWithDelay);
  };
}, []);

// Fallback mechanism in handlers
const handleAction = () => {
  let textToUse = selectedText;
  if (!textToUse.trim() && lastSelectedText.trim()) {
    textToUse = lastSelectedText; // Use backup
  }
  // ... proceed with action
};
```

---

## 5. 🏗️ Component Architecture Anti-Patterns

### ❌ **DON'T: Put Everything in One Massive Component**

```javascript
// ❌ WRONG - Monolithic component
const WritingPage = () => {
  // 800+ lines of code
  // Multiple responsibilities
  // Hard to debug and maintain
  // SSR issues mixed with client logic
};
```

### ✅ **DO: Separate Client and Server Concerns**

```javascript
// ✅ CORRECT - Separation of concerns

// Server-safe wrapper
const WritingPage = () => (
  <WritingPageClient />
);

// Client-only component with all browser interactions
const WritingPageClient = dynamic(() => import('./WritingPageClient'), {
  ssr: false
});
```

---

## 6. 📦 Build & Dependency Issues

### ❌ **DON'T: Ignore TypeScript Errors During Development**

```javascript
// ❌ WRONG - "It works in dev" mentality
// Type errors that only surface during build:
keywords: metadata.keywords || [], // Type 'string[]' is not assignable to type 'string'
```

### ✅ **DO: Fix TypeScript Errors Immediately**

```javascript
// ✅ CORRECT - Handle types properly
keywords: metadata.keywords?.join(', ') || '',
```

### 📋 **Build Testing Checklist:**
- [ ] Run `npm run build` regularly during development
- [ ] Fix TypeScript errors immediately
- [ ] Test SSR compatibility
- [ ] Verify all API routes work
- [ ] Check for missing dependencies

---

## 7. 🎨 State Management Pitfalls

### ❌ **DON'T: Use Global State for UI Interactions**

```javascript
// ❌ WRONG - Storing UI state globally
const [saveStatus, setSaveStatus] = useState(""); // Bad for notifications

// Problems:
// - Only one notification at a time
// - No proper dismissal
// - Mixed concerns
```

### ✅ **DO: Use Proper Notification Systems**

```javascript
// ✅ CORRECT - Dedicated notification system
const { showSuccess, showError, showInfo } = useToast();

// Multiple notifications
// Proper dismissal
// Better UX
```

---

## 8. 🔍 Text Processing & Replacement Issues

### ❌ **DON'T: Use Simple String Replacement for HTML Content**

```javascript
// ❌ WRONG - Fails with HTML content
const updatedContent = editorContent.replace(originalText, newText);
// Breaks when originalText is within HTML tags
```

### ✅ **DO: Handle HTML-Aware Text Replacement**

```javascript
// ✅ CORRECT - Multiple strategies
const stripHtmlTags = (html) => html.replace(/<[^>]*>?/gm, '');

// Strategy 1: Direct replacement
if (editorContent.includes(textToReplace)) {
  updatedContent = editorContent.replace(
    new RegExp(textToReplace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 
    newText
  );
} else {
  // Strategy 2: HTML-aware replacement
  const plainTextContent = stripHtmlTags(editorContent);
  if (plainTextContent.includes(textToReplace)) {
    const flexiblePattern = textToReplace
      .split(' ')
      .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+(?:<[^>]*>\\s*)*');
    
    updatedContent = editorContent.replace(
      new RegExp(flexiblePattern),
      newText
    );
  }
}
```

---

## 9. 🎯 User Experience Anti-Patterns

### ❌ **DON'T: Clear All Data on Single Actions**

```javascript
// ❌ WRONG - Nuclear approach
const handleAcceptSuggestion = () => {
  // Accepting one suggestion clears everything
  setSuggestedText("");
  setGrammarIssues([]); // Loses all other issues!
  setSelectedText("");
};
```

### ✅ **DO: Handle Individual Items Precisely**

```javascript
// ✅ CORRECT - Granular control
const handleAcceptSuggestion = (newText) => {
  const issue = grammarIssues.find(issue => issue.suggestion === newText);
  
  if (issue) {
    // Remove only this specific issue
    const updatedGrammarIssues = grammarIssues.filter(gi => gi.id !== issue.id);
    setGrammarIssues(updatedGrammarIssues);
    
    // Show remaining count
    const remainingCount = updatedGrammarIssues.length;
    showSuccess(`Issue fixed! ${remainingCount} remaining.`);
  }
};
```

---

## 10. 🚀 Performance & Loading Issues

### ❌ **DON'T: Load Heavy Components Synchronously**

```javascript
// ❌ WRONG - Blocks initial page load
import RichTextEditor from './heavy-editor-component';
```

### ✅ **DO: Use Dynamic Imports for Heavy Components**

```javascript
// ✅ CORRECT - Load only when needed
const RichTextEditor = dynamic(() => import('./heavy-editor-component'), {
  loading: () => <div>Loading editor...</div>
});
```

---

## 📋 Development Workflow Checklist

### Before Every Commit:
- [ ] `npm run build` passes without errors
- [ ] TypeScript strict mode enabled
- [ ] All browser APIs properly guarded
- [ ] No console errors in browser
- [ ] SSR compatibility verified

### Before Production:
- [ ] All dynamic imports properly configured
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations
- [ ] Proper notification system
- [ ] Text selection edge cases handled

### Code Review Focus:
- [ ] SSR safety
- [ ] TypeScript compliance
- [ ] Event handler types
- [ ] State management patterns
- [ ] User experience flows

---

## 🎯 Key Takeaways

1. **SSR First**: Always assume your code will run on the server
2. **TypeScript Strict**: Fix type errors immediately, don't postpone
3. **User Experience**: Preserve user context (selections, state)
4. **Build Early**: Test builds frequently during development
5. **Separation of Concerns**: Client logic ≠ Server logic
6. **Graceful Degradation**: Handle edge cases and failures
7. **Professional UX**: Proper notifications and feedback

---

*"An ounce of prevention is worth a pound of cure"* - Especially true for SSR and TypeScript issues!

Remember: These pitfalls were discovered through real debugging sessions. Each "DON'T" represents hours of debugging time that could have been avoided with proper initial implementation.
