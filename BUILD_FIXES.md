# Build Fixes - Troubleshooting Guide

## Problem
EAS Build was failing with C++ linker errors on Expo SDK 54 + React Native 0.81.4

## Root Cause
**`newArchEnabled=true`** in `android/gradle.properties` was enabling React Native's New Architecture, which requires proper C++ standard library linking that was failing with NDK 27.

## Solution Applied

### 1. **Disabled New Architecture**
Added to `app.config.js`:
```javascript
android: {
  package: "com.tarotoracle.app",
  newArchEnabled: false  // ← Key fix!
}
```

### 2. **Removed AdMob Packages**
These were causing additional C++ linker issues:
- ❌ `react-native-google-mobile-ads`
- ❌ `react-native-worklets`
- ❌ `react-native-worklets-core`

But then re-added worklets for reanimated:
- ✅ `react-native-worklets@0.5.1`
- ✅ `react-native-worklets-core@^1.6.2`

### 3. **Restored Expo SDK 54**
Matched the exact versions from the working APK:
```json
{
  "expo": "~54.0.0",
  "react": "19.1.0",
  "react-native": "0.81.4",
  "@react-native-google-signin/google-signin": "^16.0.0"
}
```

### 4. **Added Stripe Support**
- ✅ `@react-native-firebase/functions@^23.4.1`
- ✅ Cloud Functions deployed
- ✅ Webhook configured

### 5. **Fixed Package Name**
Changed from `Tarot_Oracle` to `tarot-oracle` (lowercase with hyphen)

### 6. **Added EAS Build Config**
In `eas.json`:
```json
{
  "preview": {
    "env": {
      "npm_config_legacy_peer_deps": "true"
    }
  }
}
```

### 7. **Clean Build Process**
1. Deleted `android/` directory
2. Let EAS Build do fresh prebuild with new config
3. Build with `newArchEnabled: false` applied

## Testing Locally Before Build

To avoid wasting EAS build credits:

```bash
# Test bundle creation
npx expo export --platform android

# Test prebuild (requires Java)
npx expo prebuild --platform android --clean

# Check TypeScript errors
npx tsc --noEmit
```

## Current Build Status
🔄 **IN PROGRESS**: Building with all fixes applied
📦 Build URL: Check EAS terminal output

## Next Steps After Successful Build
1. Download APK
2. Install on device
3. Test Subscribe button → Opens Stripe Checkout
4. Complete test payment
5. Verify subscription activation in Firestore

## Key Lessons
- ✅ Always check `newArchEnabled` setting
- ✅ Test bundle locally first: `npx expo export`
- ✅ Clean builds when changing major config: delete `android/` folder
- ✅ Use `--legacy-peer-deps` for React Native projects
- ✅ Match exact package versions from working builds
