# 🚀 Quick Start Cheat Sheet

## Initial Setup (One Time Only)

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env with your Firebase credentials

# 3. Login to EAS
npx eas login

# 4. Initialize EAS project
npx eas init

# 5. Build development client
npx eas build --profile development --platform android
```

## Daily Development

```bash
# Start Metro bundler
npx expo start

# In Metro terminal:
# Press 'a' - Open Android
# Press 'w' - Open Web  
# Press 'r' - Reload app
# Press 'j' - Open debugger
```

## Common Commands

```bash
# Clear cache and restart
npx expo start --clear

# Run on Android (local build)
npx expo run:android

# Build production APK
npx eas build --profile production --platform android

# Check EAS credentials
npx eas credentials

# View EAS builds
npx eas build:list
```

## Firebase Setup Checklist

- [ ] Create Firebase project
- [ ] Enable Email/Password auth
- [ ] Enable Google auth
- [ ] Create Firestore database
- [ ] Download google-services.json (place in root and android/app/)
- [ ] Download GoogleService-Info.plist (place in root)
- [ ] Get SHA-1 fingerprint
- [ ] Add SHA-1 to Firebase Console
- [ ] Download updated google-services.json
- [ ] Copy all Firebase config to .env

## Get SHA-1 Fingerprint

```bash
# Windows
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android

# macOS/Linux
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

# From EAS
npx eas credentials
# → Android → Production → Keystore → View
```

## Troubleshooting

### Google Sign-In Not Working?
1. Check SHA-1 is in Firebase Console
2. Download latest google-services.json
3. Replace in BOTH locations (root + android/app/)
4. **REBUILD THE APP** (not just reload!)

### App Won't Build?
```bash
# Clear Android cache
cd android
./gradlew clean
cd ..

# Clear Metro cache
npx expo start --clear
```

### Metro Bundler Issues?
```bash
# Kill all Node processes (Windows)
taskkill /F /IM node.exe

# Kill all Node processes (macOS/Linux)
killall node

# Restart
npx expo start --clear
```

## File Locations to Remember

```
.env                              # Your secrets (NEVER COMMIT!)
google-services.json              # Firebase Android config
android/app/google-services.json  # Same file (keep both updated!)
GoogleService-Info.plist          # Firebase iOS config
app.config.js                     # Expo configuration
eas.json                          # EAS build configuration
```

## Environment Variables Quick Ref

```env
MODE=mock          # For testing (fake APIs)
MODE=prod          # For production (real APIs)

GOOGLE_WEB_CLIENT_ID=...  # From Google Cloud Console → Credentials
FIREBASE_API_KEY=...      # From Firebase Console → Project Settings
```

## Important URLs

- Firebase Console: https://console.firebase.google.com/
- Google Cloud Console: https://console.cloud.google.com/
- EAS Builds: https://expo.dev/accounts/[username]/projects/Tarot_Oracle/builds
- Expo Docs: https://docs.expo.dev/

## When to Rebuild vs Reload

### Just Reload (Ctrl+R in app)
- JavaScript/TypeScript code changes
- Component updates
- Style changes
- Text changes

### Must Rebuild
- Changed google-services.json
- Updated React Native Firebase packages
- Modified app.config.js plugins
- Added/removed native dependencies
- Changed Android/iOS native code

## Build Profiles

**Development**: For testing on device
```bash
npx eas build --profile development --platform android
```

**Production**: For app store/distribution
```bash
npx eas build --profile production --platform android
```

## Git Best Practices

**Always add to .gitignore:**
- .env
- google-services.json
- GoogleService-Info.plist
- *.keystore
- android/app/google-services.json

**Safe to commit:**
- .env.example
- app.config.js
- eas.json
- package.json

## Getting Help

1. Check SETUP_GUIDE.md for detailed instructions
2. Check FIREBASE_ARCHITECTURE.md for Firebase details
3. Search error messages in Expo docs
4. Check Firebase documentation
5. Google the exact error message

---

**Pro Tip**: Keep this file open in a separate window while developing! 💡
