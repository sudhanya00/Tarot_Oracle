# Firebase & Google Sign-In Architecture

## Overview

This app uses **platform-specific Firebase implementations** to avoid compatibility issues between Firebase Web SDK and React Native.

## Architecture

### Platform Detection

```typescript
if (Platform.OS === 'web') {
  // Use Firebase Web SDK
} else {
  // Use React Native Firebase (native modules)
}
```

### Web Platform

**SDK**: Firebase JS SDK (`firebase` package)

**Packages**:
- `firebase/app` - Core Firebase app
- `firebase/auth` - Authentication
- `firebase/firestore` - Firestore database

**Google Sign-In**:
```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
```

### Mobile Platform (iOS/Android)

**SDK**: React Native Firebase (native modules)

**Packages**:
- `@react-native-firebase/app` - Core app
- `@react-native-firebase/auth` - Authentication
- `@react-native-firebase/firestore` - Firestore
- `@react-native-google-signin/google-signin` - Google Sign-In

**Google Sign-In Flow**:
1. Configure Google Sign-In with Web Client ID
2. Check Google Play Services availability
3. Open native Google account picker
4. Get ID token from Google
5. Create Firebase credential with token
6. Sign in to Firebase with credential

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

// Configure
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

// Sign in
const { idToken } = await GoogleSignin.signIn();
const googleCredential = auth.GoogleAuthProvider.credential(idToken);
await auth().signInWithCredential(googleCredential);
```

## Key Files

### `src/lib/firebase-config.ts`

Central Firebase initialization with platform detection:

```typescript
export async function initializeFirebase() {
  if (Platform.OS === 'web') {
    // Initialize Firebase Web SDK
    const { initializeApp } = await import('firebase/app');
    const { initializeAuth, browserLocalPersistence } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    
    app = initializeApp(config);
    auth = initializeAuth(app, { persistence: browserLocalPersistence });
    db = getFirestore(app);
  } else {
    // Initialize React Native Firebase
    const rnfAuth = await import('@react-native-firebase/auth');
    const rnfFirestore = await import('@react-native-firebase/firestore');
    
    auth = rnfAuth.default();
    db = rnfFirestore.default();
  }
  
  return { app, auth, db };
}
```

### `src/lib/auth.ts`

Platform-specific authentication functions:

```typescript
export async function signInWithGoogleAsync(): Promise<AuthUser> {
  const { auth } = await initializeFirebase();
  
  if (Platform.OS === 'web') {
    // Web: Popup flow
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } else {
    // Mobile: Native Google Sign-In
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    const rnfAuth = await import('@react-native-firebase/auth');
    
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
    
    const { idToken } = await GoogleSignin.signIn();
    const credential = rnfAuth.default.GoogleAuthProvider.credential(idToken);
    const userCredential = await auth.signInWithCredential(credential);
    return userCredential.user;
  }
}
```

### `src/context/AuthProvider.tsx`

Platform-specific auth state listener:

```typescript
if (Platform.OS === 'web') {
  // Web: Firebase Web SDK
  const { onAuthStateChanged } = await import('firebase/auth');
  unsubscribe = onAuthStateChanged(auth, handleAuthChange);
} else {
  // Mobile: React Native Firebase
  unsubscribe = auth.onAuthStateChanged(handleAuthChange);
}
```

## Configuration Files

### Android: `google-services.json`

**Location**: 
- `./google-services.json` (root)
- `./android/app/google-services.json`

**Contains**:
- Firebase project configuration
- Google Sign-In OAuth client IDs
- SHA-1 certificate fingerprints

**Critical**: Must include SHA-1 from your signing keystore!

### iOS: `GoogleService-Info.plist`

**Location**: `./GoogleService-Info.plist` (root)

**Contains**:
- Firebase iOS app configuration
- Bundle identifier
- API keys

## Google Sign-In Setup

### 1. Firebase Console

1. **Enable Google Authentication**:
   - Firebase Console → Authentication → Sign-in method
   - Enable "Google"
   - Add support email

2. **Register Apps**:
   - Add Android app with package name: `com.tarotoracle.app`
   - Add iOS app with bundle ID: `com.tarotoracle.app`
   - Add Web app

3. **Add SHA-1 Fingerprints** (Android only):
   - Get SHA-1 from keystore
   - Firebase Console → Project Settings → Your Android app
   - Click "Add fingerprint"
   - Paste SHA-1 and save

### 2. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Find OAuth 2.0 Client IDs:
   - **Web client** - Copy Client ID to `GOOGLE_WEB_CLIENT_ID` in `.env`
   - **Android client** - Should match your SHA-1
   - **iOS client** - Should match your bundle ID

### 3. Environment Variables

Add to `.env`:
```env
GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

This Web Client ID is used by:
- Web platform: For `signInWithPopup`
- Android: For `GoogleSignin.configure()`

## SHA-1 Fingerprints Explained

### What is SHA-1?

SHA-1 is a cryptographic fingerprint of your app's signing certificate. Google uses it to verify that sign-in requests come from your app.

### Why Multiple SHA-1s?

You'll need different SHA-1s for:

1. **Debug Keystore** (local development):
   - Location: `android/app/debug.keystore`
   - Used when running `npx expo run:android`
   
2. **EAS Build Keystore** (production):
   - Managed by Expo
   - Used when building with `npx eas build`
   
3. **Upload Keystore** (Play Store):
   - For apps uploaded to Google Play
   - Google Play re-signs with their own key

### Getting SHA-1 Fingerprints

**Debug Keystore**:
```bash
# Windows
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android

# macOS/Linux
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**EAS Keystore**:
```bash
npx eas credentials
# Select: Android → Production → Keystore → View
```

**Play Store Upload Key**:
- Get from Google Play Console → Setup → App signing

### Adding SHA-1 to Firebase

1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps" → Select Android app
3. Click "Add fingerprint"
4. Paste SHA-1 (format: `AA:BB:CC:DD:...`)
5. Click Save
6. Download updated `google-services.json`
7. Replace in your project (both locations!)
8. **Rebuild the app** (native code changed)

## Common Issues

### "Component auth has not been registered yet"

**Cause**: Auth accessed before Firebase initialization completes

**Solution**: 
- `App.tsx` initializes Firebase on mount
- All components wait for `firebaseReady` state
- Auth functions call `initializeFirebase()` before use

### "DEVELOPER_ERROR" (Google Sign-In)

**Cause**: SHA-1 not registered or `google-services.json` outdated

**Solution**:
1. Verify SHA-1 is in Firebase Console
2. Download latest `google-services.json`
3. Replace both copies
4. Rebuild app (don't just reload!)

### Build Required After Changes

**When you MUST rebuild**:
- Changed `google-services.json`
- Updated React Native Firebase packages
- Modified native Android/iOS code
- Changed app.config.js plugins

**How to rebuild**:
```bash
# EAS Build
npx eas build --profile development --platform android

# Local build
npx expo run:android
```

## Development Workflow

### First Time Setup

1. Install dependencies
2. Set up Firebase project
3. Download `google-services.json` and `GoogleService-Info.plist`
4. Get debug keystore SHA-1
5. Add SHA-1 to Firebase
6. Download updated `google-services.json`
7. Build development client:
   ```bash
   npx eas build --profile development --platform android
   ```
8. Install APK on device
9. Run Metro bundler:
   ```bash
   npx expo start
   ```

### Daily Development

1. Start Metro: `npx expo start`
2. Open app on device (scans QR code)
3. Make code changes
4. App reloads automatically
5. **No rebuild needed** unless changing native code

### Production Release

1. Get production keystore SHA-1 from EAS
2. Add to Firebase (if not already)
3. Download latest `google-services.json`
4. Update version in `app.config.js`
5. Build production:
   ```bash
   npx eas build --profile production --platform android
   ```
6. Test APK thoroughly
7. Submit to Play Store

## Testing Google Sign-In

### On Android Device

1. Make sure device has Google Play Services
2. Have a Google account signed in to device
3. Click "Sign in with Google"
4. Native account picker should appear
5. Select account
6. Grant permissions
7. Should redirect to app as signed-in user

### On Web

1. Open in browser: `http://localhost:8081`
2. Click "Sign in with Google"
3. Google popup window appears
4. Select account
5. Grant permissions
6. Popup closes, user signed in

### Mock Mode

For testing without real Firebase:

```env
MODE=mock
```

- Bypasses real authentication
- Uses mock user data
- No network calls

## Security Best Practices

1. **Never commit**:
   - `.env` file
   - `google-services.json`
   - `GoogleService-Info.plist`
   - Keystore files

2. **Use environment variables** for all sensitive data

3. **Enable Firestore security rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

4. **Restrict API keys** in Google Cloud Console:
   - Restrict by package name (Android)
   - Restrict by bundle ID (iOS)
   - Restrict by HTTP referrer (Web)

## Resources

- [React Native Firebase Docs](https://rnfirebase.io/)
- [Firebase Web SDK Docs](https://firebase.google.com/docs/web/setup)
- [Google Sign-In for React Native](https://react-native-google-signin.github.io/docs/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)

---

**Key Takeaway**: This dual-SDK approach (Web SDK for web, React Native Firebase for mobile) ensures maximum compatibility and native Google Sign-In experience on all platforms.
