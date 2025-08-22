# Splash Screen Design System 🎨

## Overview
This project uses a **single source of truth** for splash screen design across all platforms. Instead of maintaining separate design files, everything references `design-tokens.js`.

## How It Works

### 1. Single Source of Truth
**File:** `design-tokens.js`
- Contains all colors, fonts, animations, and layout values
- Used by React LoadingScreen component
- Synced to native iOS/Android assets via build script

### 2. Platform Coverage
- ✅ **React LoadingScreen** - imports directly from design tokens
- ✅ **iOS LaunchScreen** - background color synced automatically  
- ✅ **Android Splash** - colors and styles synced automatically
- ✅ **Capacitor Plugin** - configuration synced automatically

### 3. Seamless Handoff
1. Native splash shows during app cold start (0-2 seconds)
2. WebView loads and React renders
3. Native splash fades out smoothly to React LoadingScreen
4. LoadingScreen handles data loading (2-5 seconds)
5. App content appears

## Making Design Changes

### ✅ Correct Way (One Source)
1. Edit `design-tokens.js`
2. Run `npm run sync-splash`
3. Run `npx cap sync`
4. Build and test

```javascript
// design-tokens.js
export const splashScreenTokens = {
  backgroundColor: '#88b7b5', // Change this
  appName: 'bestlist',        // Or this
  iconFilter: 'brightness(0) saturate(100%) invert(100%)',
  // ... other tokens
};
```

### ❌ Wrong Way (Multiple Sources)
- Don't edit iOS storyboard directly
- Don't edit Android drawable/colors directly  
- Don't edit Capacitor config directly
- Don't edit LoadingScreen component directly

## File Structure

```
project/
├── design-tokens.js                    # 👑 SINGLE SOURCE OF TRUTH
├── components/LoadingScreen.jsx        # Imports from design-tokens.js
├── main.jsx                           # Controls native→React handoff
├── capacitor.config.json              # Auto-synced by script
├── scripts/sync-splash-design.js      # Build automation
├── ios/App/App/Base.lproj/LaunchScreen.storyboard  # Auto-synced
└── android/app/src/main/res/
    ├── values/colors.xml              # Auto-synced
    └── values/styles.xml              # Auto-synced
```

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm run sync-splash` | Sync design tokens to all platforms |
| `npx cap sync` | Apply changes to native projects |
| `npm run build` | Build for production |

## Benefits

### ✅ Before This System
- ❌ 4+ files to edit for design changes
- ❌ Easy to get out of sync
- ❌ Platform-specific knowledge required
- ❌ Manual coordination between native and React

### ✅ After This System
- ✅ 1 file to edit for design changes
- ✅ Impossible to get out of sync (automated)
- ✅ No platform-specific knowledge needed
- ✅ Automatic coordination across all platforms

## Technical Details

### Native Splash (0-2s)
- **Purpose:** Cover app cold start and JS bundle load
- **Duration:** OS-controlled, typically 1-3 seconds
- **Customization:** Background color only (OS limitations)

### React LoadingScreen (2-5s)  
- **Purpose:** Handle data loading with rich UI
- **Duration:** App-controlled based on loading progress
- **Customization:** Full React component with animations

### Capacitor SplashScreen Plugin
- **Purpose:** Bridge between native and React
- **Configuration:** Auto-synced from design tokens
- **Behavior:** Fades out when React is ready

## Troubleshooting

### Splash screens don't match
```bash
npm run sync-splash
npx cap sync
# Rebuild app
```

### Changes not appearing on device
1. Ensure you ran `npx cap sync`
2. Clean build the native app
3. Check design-tokens.js syntax

### Native splash too long/short
- Controlled by OS and JS bundle size
- Optimize bundle size for faster handoff
- Cannot directly control native duration

## Best Practices

1. **Always use the sync script** - Never edit native files directly
2. **Test on device** - Simulators may not show real splash timing  
3. **Keep tokens simple** - Complex animations won't work in native splash
4. **Version control** - Commit design-tokens.js changes
5. **Document changes** - Update this guide when adding new tokens
