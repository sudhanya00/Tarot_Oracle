# Production Build Checklist ✅

## Overview
This document contains all the configuration needed to build a production APK with real Firebase authentication and OpenAI API integration.

## Environment Variables Added to EAS (Preview Environment)

All these variables have been added to EAS and will be automatically loaded during build:

### OpenAI API
- ✅ `OPENAI_API_KEY` - For real tarot readings

### Firebase Configuration
- ✅ `FIREBASE_API_KEY`
- ✅ `FIREBASE_AUTH_DOMAIN` 
- ✅ `FIREBASE_PROJECT_ID`
- ✅ `FIREBASE_STORAGE_BUCKET`
- ✅ `FIREBASE_MESSAGING_SENDER_ID`
- ✅ `FIREBASE_APP_ID`
- ✅ `FIREBASE_APP_ID_ANDROID`
- ✅ `FIREBASE_MEASUREMENT_ID`

### Google Sign-In
- ✅ `GOOGLE_WEB_CLIENT_ID`

### Application Mode
- ✅ `MODE=prod` (set in eas.json)

## Build Command

To build the production APK, run:

```bash
eas build --profile preview --platform android
```

## What This Build Includes

### 1. Real Authentication ✅
- Firebase Email/Password authentication
- Google Sign-In
- Password reset functionality
- No mock users

### 2. Real OpenAI Integration ✅
- Actual tarot card readings from OpenAI API
- No hardcoded mock responses
- Enlighten button functionality

### 3. Real Firestore Database ✅
- Chat history saved to Firestore
- Real-time sync across devices
- Persistent storage

### 4. Configuration Files
- `app.config.js` - Updated with correct owner (sudhanya) and project ID
- `eas.json` - MODE=prod in preview profile
- `babel.config.js` - NativeWind as preset, Reanimated plugin
- `package.json` - Firebase v21.8.0, React Native 0.81.4
- Node version: 22.11.0

## Key Changes Made

### 1. Fixed Babel Configuration
```javascript
// babel.config.js
presets: [
  "babel-preset-expo",
  "nativewind/babel"  // Moved from plugins to presets
],
plugins: [
  "react-native-reanimated/plugin"
]
```

### 2. Enabled New Architecture
```javascript
// app.config.js
android: {
  newArchEnabled: true  // Required for React Native Reanimated 4.x
},
ios: {
  newArchEnabled: true
}
```

### 3. Downgraded Firebase for Compatibility
```json
// package.json
"@react-native-firebase/app": "^21.8.0",
"@react-native-firebase/auth": "^21.8.0",
"@react-native-firebase/firestore": "^21.8.0",
"@react-native-firebase/functions": "^21.8.0"
```

### 4. Updated Node Version
```json
// eas.json
"preview": {
  "node": "22.11.0"  // Required for React Native 0.81.4
}
```

## Network Issues?

If you encounter network errors like `getaddrinfo EAI_AGAIN`, try:

1. **Wait and retry** - Network might be temporarily unstable
2. **Check DNS** - Try using Google DNS (8.8.8.8, 8.8.4.4)
3. **Check firewall** - Ensure storage.googleapis.com isn't blocked
4. **Use VPN** - If regional restrictions apply
5. **Retry command** - Sometimes it works on second attempt

## Testing the Production Build

Once the APK is built and installed:

### Test Authentication
1. Try email/password sign up
2. Try Google Sign-In
3. Test password reset
4. Verify logout works

### Test Chat Functionality
1. Send a message - should get real AI response
2. Check chat history saves properly
3. Verify multiple chats work
4. Test "Enlighten" button

### Test Firebase Integration
1. Check if chats persist after app restart
2. Verify data saves to Firestore (check Firebase Console)
3. Test across multiple devices

## Build Status

Last successful build commit: `e9ebfad`
Branch: `AdMobBanner_SK_19102025`

## Troubleshooting

### If app still shows mock mode:
- Check the APK was built AFTER the environment variables were added
- Verify MODE=prod in build output
- Check build logs show all env vars loaded

### If authentication doesn't work:
- Verify Firebase credentials in Firebase Console
- Check google-services.json is correct
- Enable Email/Password auth in Firebase Console
- Configure Google Sign-In in Firebase Console

### If OpenAI doesn't work:
- Verify API key is valid
- Check OpenAI account has credits
- Test API key with curl or Postman first

## Next Steps After Successful Build

1. Download APK from EAS build page
2. Install on device
3. Test all functionality
4. If everything works, proceed to production build
5. Upload to Google Play Store (production profile)

---
**Note:** This checklist was created on October 21, 2025
**EAS Account:** sudhanya
**Project ID:** e18adf91-3d38-4345-9bf5-5085d46adfef
