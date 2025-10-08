# Usage Limit Components Guide

This guide explains how to use the usage limit components in the application.

## Components

### 1. UsageIndicator (Navbar)
**Location:** `components/ui/usage-indicator.tsx`

Compact usage indicator for the navigation bar/header. Shows a popover with all usage metrics when clicked.

#### Usage:
```tsx
import { UsageIndicator } from '@/components/ui/usage-indicator'

// In your header/navbar component
<UsageIndicator />
```

#### Features:
- Shows user's plan name (Free/Premium)
- Displays all usage metrics in a popover
- Shows warning indicator when nearing limits
- Premium badge with crown icon
- Upgrade button for free users

---

### 2. FeatureUsageBar (Feature Pages)
**Location:** `components/ui/usage-display.tsx`

Inline progress bar for individual feature pages (Reading, Writing, Search, Exam).

#### Usage:
```tsx
import { FeatureUsageBar } from '@/components/ui/usage-display'
import { useUsageLimits } from '@/hooks/use-usage-limits'

function ReadingPage() {
  const { usage, getCurrentLimit } = useUsageLimits()

  return (
    <div>
      {/* Show at top of page or in header */}
      <FeatureUsageBar
        label="Documents uploaded this week"
        used={usage.documents_uploaded}
        limit={getCurrentLimit('documents_uploaded')}
      />

      {/* Your page content */}
    </div>
  )
}
```

#### Props:
- `label`: Display text for the usage bar
- `used`: Current usage count
- `limit`: Maximum allowed
- `unit?`: Optional unit suffix (e.g., " words", " MB")
- `showLabel?`: Whether to show the label (default: true)

#### Features:
- Auto-hides for Premium unlimited features
- Shows warning colors (yellow at 80%, red at 100%)
- Displays warning icon when approaching limit
- Compact design that doesn't take much space

---

## Plan Limits

The system automatically applies the correct limits based on the user's plan:

### Free Plan ($0)
- 3 document uploads/week
- 5,000 words/month in writing
- 10 search queries/week
- 1 exam session/month
- 250MB storage

### Premium Plan ($15/month or $100/year)
- 100 document uploads/day
- 25,000 words/day in writing
- 500 search queries/day
- 50 exam sessions/week
- 10GB storage

---

## Example Implementations

### Reading Page
```tsx
import { FeatureUsageBar } from '@/components/ui/usage-display'
import { useUsageLimits } from '@/hooks/use-usage-limits'

export default function ReadingPage() {
  const { usage, getCurrentLimit, isLoading } = useUsageLimits()

  return (
    <div className="space-y-4">
      {!isLoading && (
        <FeatureUsageBar
          label="Documents uploaded"
          used={usage.documents_uploaded}
          limit={getCurrentLimit('documents_uploaded')}
        />
      )}
      {/* Rest of your content */}
    </div>
  )
}
```

### Writing Page
```tsx
import { FeatureUsageBar } from '@/components/ui/usage-display'
import { useUsageLimits } from '@/hooks/use-usage-limits'

export default function WritingPage() {
  const { usage, getCurrentLimit, isLoading } = useUsageLimits()

  return (
    <div className="space-y-4">
      {!isLoading && (
        <FeatureUsageBar
          label="Words used this month"
          used={usage.writing_words}
          limit={getCurrentLimit('writing_words')}
          unit=" words"
        />
      )}
      {/* Rest of your content */}
    </div>
  )
}
```

### Adding to Navbar/Header
```tsx
import { UsageIndicator } from '@/components/ui/usage-indicator'

export function Header() {
  return (
    <header>
      {/* Your other header content */}
      <div className="flex items-center gap-2">
        <UsageIndicator />
        {/* Other buttons/icons */}
      </div>
    </header>
  )
}
```

---

## Hook: useUsageLimits

The main hook for accessing usage data:

```tsx
const {
  usage,              // Current usage data
  limits,             // Raw limits from subscription
  planName,           // "Free" or "Premium" or "Premium Elite"
  isLoading,          // Loading state
  error,              // Error message if any
  isFreePlan,         // Boolean: is user on free plan
  getCurrentLimit,    // Function: get limit for a feature
  getCurrentUsage,    // Function: get usage for a feature
  isNearLimit,        // Function: check if near limit (>75%)
  isAtLimit,          // Function: check if at limit
  checkUsageLimit,    // Function: check if can perform action
  incrementUsage,     // Function: increment usage after action
  refreshUsage,       // Function: manually refresh data
} = useUsageLimits()
```

---

## Best Practices

1. **Use UsageIndicator in the navbar** - Single source of truth for all limits
2. **Use FeatureUsageBar on feature pages** - Show relevant limit where it matters
3. **Don't show usage on dashboard** - Keep dashboard clean, limits are in navbar
4. **Check before actions** - Use `checkUsageLimit()` before allowing operations
5. **Increment after success** - Call `incrementUsage()` after successful operations
6. **Handle Premium gracefully** - Components auto-hide for unlimited features

---

## Migration from Old UsageDisplay

The old `UsageDisplay` component that showed all limits on the dashboard is deprecated:

```tsx
// ❌ OLD - Don't use
<UsageDisplay usage={usage} limits={limits} planName={planName} />

// ✅ NEW - Use these instead
// In navbar:
<UsageIndicator />

// On feature pages:
<FeatureUsageBar label="..." used={...} limit={...} />
```