# Android Implementation Guide

This guide documents the Android-specific implementations created with Material Design principles for the Task Manager app.

## Overview

All iOS screens have been recreated with Android-specific Material Design components and styling. Platform-specific files use the `.android.tsx` extension and will automatically be used on Android devices.

## Platform-Specific Files Created

### 1. **Project Screen** - `app/(tabs)/project.android.tsx`
**Material Design Features:**
- Material Top App Bar (instead of iOS large title)
- Material FAB (Floating Action Button) with elevation
- Ripple effects on touch (via `android_ripple`)
- Material card elevation and shadows
- Material color palette (Primary: #6200EE, Secondary: #BB86FC)
- Status bar integration
- Rounded corner cards (12px radius)
- Material typography (Roboto-like sizing)

**Key Differences from iOS:**
- No BlurView - uses solid backgrounds with elevation
- Material ripple instead of iOS press states
- Flatter card design with elevation instead of heavy shadows
- Material color chips for status badges
- Standard Android spacing (16dp, 24dp)

### 2. **Profile/Settings Screen** - `app/(tabs)/profile.android.tsx`
**Material Design Features:**
- Material list items with dividers
- Material text buttons (uppercase text)
- Material modals with full-screen presentation
- Section headers with Material typography
- Material form inputs with underlines
- Ripple effects throughout
- Material icon placement (left-aligned with 16dp padding)

**Key Differences from iOS:**
- No grouped list style - uses Material cards
- Uppercase button text (SAVE, EDIT, CREATE)
- Emoji icons instead of SF Symbols
- Dividers extend from icon boundary (not full width)
- Material elevation (1-4dp) instead of iOS shadows

### 3. **Members Screen** - `app/(tabs)/members.android.tsx`
**Material Design Features:**
- Material search bar with pill shape (24px radius)
- Material member cards with elevation
- Material avatar sizing (48dp)
- Material color system for avatars
- Material typography hierarchy
- Pull-to-refresh with Material spinner

**Key Differences from iOS:**
- Rounded search bar instead of iOS rectangular
- Material colors for section headers
- Flatter avatar design
- Standard Material spacing
- Material Ripple for interaction feedback

### 4. **Onboarding Screen** - `app/(auth)/onboarding.android.tsx`
**Material Design Features:**
- Material progress indicators (dots instead of bar)
- Material button styling with elevation
- Material card-based role selection
- Material form fields
- Material bottom navigation bar
- Material outlined buttons for "Back"
- Material filled buttons for "Next/Complete"

**Key Differences from iOS:**
- Dot-based progress instead of linear bar
- Material elevation on header
- Outlined vs filled button distinction
- Material grid layout for roles
- Standard Material padding (24dp)

### 5. **Login Screen** - `app/(auth)/login.android.tsx`
**Material Design Features:**
- Material cards for OAuth buttons
- Material elevation system
- Centered logo with elevation
- Material button styling
- Material spacing and typography

**Key Differences from iOS:**
- No BlurView - solid backgrounds
- Material card elevation on buttons
- Centered layout approach
- Material icon sizing

## Design System

### Colors
```javascript
// Light Theme
Primary: '#6200EE'      // Material Purple
Secondary: '#BB86FC'    // Material Light Purple
Background: '#FAFAFA'   // Material Light Background
Surface: '#FFFFFF'      // Material Surface
Error: '#F44336'        // Material Red

// Dark Theme
Primary: '#BB86FC'      // Material Dark Purple
Background: '#121212'   // Material Dark Background
Surface: '#1F1F1F'      // Material Dark Surface
OnSurface: '#FFFFFF'
OnSurfaceVariant: '#B3B3B3'
```

### Typography
```javascript
// Headlines
Display: 28sp, Semi-Bold (600)
Headline: 22sp, Semi-Bold (600)
Title: 20sp, Medium (500)

// Body
Body Large: 16sp, Regular (400)
Body Medium: 14sp, Regular (400)
Label: 12sp, Medium (500)

// Letter Spacing
Tight: 0.15
Normal: 0.25
Wide: 0.5
```

### Spacing
```javascript
// Material Design 8dp Grid
XS: 4dp
S: 8dp
M: 12dp
L: 16dp
XL: 24dp
XXL: 32dp
```

### Elevation
```javascript
Level 0: 0dp (flush)
Level 1: 1dp (cards, inputs)
Level 2: 2dp (app bar, cards on hover)
Level 3: 4dp (FAB, raised buttons)
Level 4: 6dp (FAB on press)
Level 5: 8dp (navigation drawer, modal)
```

### Border Radius
```javascript
Small: 4dp (chips)
Medium: 8dp (cards, buttons)
Large: 12dp (large cards)
XLarge: 24dp (search bars, pills)
Full: 50% (avatars, FABs)
```

## Component Patterns

### Material Ripple
```tsx
<Pressable
  android_ripple={{
    color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  }}
>
  {/* Content */}
</Pressable>
```

### Material Card
```tsx
<View style={[
  styles.card,
  {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  }
]}>
  {/* Content */}
</View>
```

### Material Button
```tsx
<TouchableOpacity
  style={[
    styles.button,
    {
      backgroundColor: isDark ? '#BB86FC' : '#6200EE',
      elevation: 4,
    }
  ]}
>
  <Text style={styles.buttonText}>
    ACTION TEXT
  </Text>
</TouchableOpacity>
```

### Material List Item
```tsx
<Pressable
  android_ripple={{
    color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  }}
  style={styles.listItem}
>
  <View style={styles.iconContainer}>
    <Text style={styles.icon}>🔔</Text>
  </View>
  <Text style={styles.itemText}>
    Item Label
  </Text>
  <Text style={styles.chevron}>›</Text>
</Pressable>
```

## Status Bar Management

All Android screens properly configure the status bar:

```tsx
<StatusBar
  barStyle={isDark ? 'light-content' : 'dark-content'}
  backgroundColor={isDark ? '#1F1F1F' : '#FFFFFF'}
/>
```

## Dark Mode Support

Both themes fully implemented following Material Design dark theme guidelines:

**Light Theme:**
- Background: #FAFAFA
- Surface: #FFFFFF
- Primary: #6200EE
- On Surface: #000000

**Dark Theme:**
- Background: #121212
- Surface: #1F1F1F
- Primary: #BB86FC
- On Surface: #FFFFFF

## Accessibility

Material Design accessibility features implemented:
- Minimum touch target size: 48dp
- Sufficient color contrast ratios (WCAG AA)
- Ripple feedback on all interactive elements
- Semantic labels where appropriate
- Keyboard navigation support

## Platform Detection

Files are automatically selected based on platform:
- `*.android.tsx` - Used on Android devices
- `*.ios.tsx` - Used on iOS devices  
- `*.tsx` - Fallback for both platforms

## Testing Checklist

### Visual Testing
- ✅ All screens render correctly in light mode
- ✅ All screens render correctly in dark mode
- ✅ Ripple effects work on all touchable elements
- ✅ Elevation shadows appear correctly
- ✅ Typography sizing is consistent
- ✅ Spacing follows 8dp grid
- ✅ Colors match Material Design palette

### Interaction Testing
- ✅ Ripple feedback on press
- ✅ Modal presentations work
- ✅ Form inputs accept text
- ✅ Navigation flows correctly
- ✅ Pull-to-refresh functions
- ✅ FAB creates new items
- ✅ OAuth login triggers correctly

### Edge Cases
- ✅ Long text wraps appropriately
- ✅ Empty states display
- ✅ Loading states show
- ✅ Error handling works
- ✅ Keyboard avoidance functions
- ✅ Safe area insets respected

## Future Enhancements

Potential Material Design features to add:
- [ ] Material You dynamic color theming (Android 12+)
- [ ] Material 3 components (when available in React Native)
- [ ] Shared element transitions
- [ ] Material motion patterns
- [ ] Bottom sheets (instead of modals)
- [ ] Navigation rail (for tablets)
- [ ] Adaptive layouts for different screen sizes

## Resources

- [Material Design Guidelines](https://m3.material.io/)
- [Material Design Components](https://m3.material.io/components)
- [Material Color System](https://m3.material.io/styles/color/overview)
- [Material Typography](https://m3.material.io/styles/typography/overview)
- [Material Elevation](https://m3.material.io/styles/elevation/overview)

## Summary

All iOS features have been successfully ported to Android with proper Material Design implementation:

1. ✅ **Project Screen** - Material cards, FAB, and app bar
2. ✅ **Settings Screen** - Material lists, modals, and forms
3. ✅ **Members Screen** - Material search, cards, and avatars
4. ✅ **Onboarding Screen** - Material forms, progress, and buttons
5. ✅ **Login Screen** - Material OAuth buttons and branding

The Android implementation maintains feature parity with iOS while following platform-specific design guidelines and best practices.
