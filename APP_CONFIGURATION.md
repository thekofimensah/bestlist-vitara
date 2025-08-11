# App Configuration Guide

## 🎯 **Quick Setup**

When you decide on your final app name, update these files:

### **1. Update App Name & URL Scheme**

Edit `lib/appConfig.js`:
```javascript
export const appConfig = {
  // Change these to your final app name
  name: "your-app-name",           // URL-friendly name (no spaces)
  displayName: "Your App Name",    // User-friendly display name
  
  // URL scheme for deep linking (should match your app name)
  urlScheme: "your-app-name",      // This creates: your-app-name://
  
  // Update these when you publish to app stores
  appStoreUrl: "https://apps.apple.com/app/your-app-id",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.test.bestlist",
  
  // Optional: for future web version
  webUrl: "https://your-app-name.vercel.app",
};
```

### **2. Update Capacitor Config**

Edit `capacitor.config.json`:
```json
{
  "appId": "com.test.bestlist",
  "appName": "your-app-name",
  "plugins": {
    "App": {
      "urlScheme": "your-app-name"
    }
  }
}
```

### **3. Update Package Name (Optional)**

If you want to change the package name:
- iOS: Update `ios/App/App/Info.plist`
- Android: Update `android/app/build.gradle`

## 🔗 **Deep Link Examples**

After setup, your app will handle these URLs:
- `your-app-name://post/123` - Opens specific post
- `your-app-name://list/456` - Opens specific list

## 🚀 **Build & Test**

```bash
# Update configuration
npm run build
npx cap sync

# Test on device
npx cap run ios
npx cap run android

# Test deep links
adb shell am start -W -a android.intent.action.VIEW -d "your-app-name://post/123" com.test.bestlist
```

## 📱 **What Happens When Users Share**

1. **User shares content** → Gets link like `your-app-name://post/123`
2. **Friend clicks link** → App opens directly to that content
3. **If app not installed** → Can redirect to App Store/Play Store

## 🎨 **Current Configuration**

- **App Name**: `beslist`
- **Display Name**: `beslist`
- **URL Scheme**: `beslist://`
- **Deep Links**: `beslist://post/123`, `beslist://list/456`

## 💡 **Tips**

- Use lowercase, no spaces for `name` and `urlScheme`
- Make `displayName` user-friendly
- Test deep links thoroughly before publishing
- Consider setting up Universal Links for even better experience 