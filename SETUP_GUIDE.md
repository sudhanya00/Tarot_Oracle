# Tarot Oracle - Developer Setup Guide

This guide will help you set up the Tarot Oracle React Native app on your local machine.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Android Studio** (for Android development) - [Download](https://developer.android.com/studio)
- **Xcode** (for iOS development, macOS only) - [Download from App Store](https://apps.apple.com/us/app/xcode/id497799835)
- **Expo CLI** - Installed automatically with the project
- **EAS CLI** - For building production apps

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Tarot_Oracle
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory (copy from `.env.example` if available):

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Stripe (Publishable key for client)
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here

# AdMob
ADMOB_APP_ID_ANDROID=ca-app-pub-xxxxxxxxxxxxx~xxxxxxxxxx
ADMOB_APP_ID_IOS=ca-app-pub-xxxxxxxxxxxxx~xxxxxxxxxx
ADMOB_BANNER_ID=ca-app-pub-xxxxxxxxxxxxx/xxxxxxxxxx

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxxxx
FIREBASE_APP_ID=1:xxxx:web:xxxx
FIREBASE_APP_ID_WEB=1:xxxx:web:xxxx
FIREBASE_APP_ID_ANDROID=1:xxxx:android:xxxx
FIREBASE_APP_ID_IOS=1:xxxx:ios:xxxx
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
FIREBASE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com

# Mode (mock = fake responses; prod = real APIs)
MODE=prod
```

---

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "tarot-oracle")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in
4. Enable **Google** sign-in
   - Add your support email
   - Save

### 3. Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (or test mode for development)
4. Select a location
5. Enable

### 4. Set Up Firebase for Android

#### a. Register Android App
1. In Firebase Console, click **Add app** → Android icon
2. Enter package name: `com.tarotoracle.app`
3. Download `google-services.json`
4. Save it to:
   - `./google-services.json` (project root)
   - `./android/app/google-services.json`

#### b. Get SHA-1 Fingerprint

**For Debug Keystore:**
```bash
# Windows (PowerShell)
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore android\app\debug.keystore -alias androiddebugkey -storepass android -keypass android

# macOS/Linux
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1** fingerprint (looks like: `5E:8F:16:06:2E:A3:CD:2C:...`)

**For Production Keystore (EAS Build):**
```bash
npx eas credentials
```
- Select: Android → Production → Keystore
- View SHA-1 and SHA-256 fingerprints

#### c. Add SHA-1 to Firebase
1. Go to Firebase Console → **Project Settings**
2. Scroll to **Your apps** → Select your Android app
3. Click **Add fingerprint**
4. Paste the SHA-1 fingerprint
5. Click **Save**
6. Download the updated `google-services.json`
7. Replace both copies (root and `android/app/`)

### 5. Set Up Firebase for iOS

1. In Firebase Console, click **Add app** → iOS icon
2. Enter bundle ID: `com.tarotoracle.app`
3. Download `GoogleService-Info.plist`
4. Save it to project root: `./GoogleService-Info.plist`

### 6. Copy Firebase Config to .env

From Firebase Console → **Project Settings** → **General**:
- Copy **Web API Key** → `FIREBASE_API_KEY`
- Copy **Project ID** → `FIREBASE_PROJECT_ID`
- Copy **Storage bucket** → `FIREBASE_STORAGE_BUCKET`
- Copy **Messaging sender ID** → `FIREBASE_MESSAGING_SENDER_ID`
- Copy **App ID** (Web) → `FIREBASE_APP_ID_WEB`
- Copy **App ID** (Android) → `FIREBASE_APP_ID_ANDROID`
- Copy **App ID** (iOS) → `FIREBASE_APP_ID_IOS`
- Copy **Measurement ID** → `FIREBASE_MEASUREMENT_ID`

From **Authentication** → **Settings** → **Authorized domains**:
- Auth domain is typically: `your-project-id.firebaseapp.com`
- Copy to `FIREBASE_AUTH_DOMAIN`

From **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com/)):
- Go to **APIs & Services** → **Credentials**
- Find **Web client** → Copy Client ID to `GOOGLE_WEB_CLIENT_ID`

---

## 📱 Running the App

### Development Mode

**Start Metro Bundler:**
```bash
npx expo start
```

**Run on Android:**
```bash
npx expo run:android
```
OR press `a` in the Metro terminal

**Run on iOS (macOS only):**
```bash
npx expo run:ios
```
OR press `i` in the Metro terminal

**Run on Web:**
```bash
npx expo start --web
```
OR press `w` in the Metro terminal

---

## 🏗️ Building for Production

### Set Up EAS (Expo Application Services)

1. **Create Expo Account**: [expo.dev](https://expo.dev)

2. **Install EAS CLI:**
```bash
npm install -g eas-cli
```

3. **Login to EAS:**
```bash
npx eas login
```

4. **Configure Project:**
```bash
npx eas init
```
This will create a project and add the project ID to `app.config.js`

### Build Android APK

**Development Build:**
```bash
npx eas build --profile development --platform android
```

**Production Build:**
```bash
npx eas build --profile production --platform android
```

**Build Output:**
- Wait for build to complete (5-10 minutes)
- Download APK from the provided link
- Install on device or upload to Play Store

### Build iOS IPA

**Development Build:**
```bash
npx eas build --profile development --platform ios
```

**Production Build:**
```bash
npx eas build --profile production --platform ios
```

---

## 🔑 Important Notes

### Google Sign-In Setup

**Critical:** After building with EAS, you MUST:
1. Get the SHA-1 from the EAS keystore (`npx eas credentials`)
2. Add it to Firebase Console
3. Download updated `google-services.json`
4. Rebuild the app

**Why?** Google Sign-In requires the SHA-1 certificate fingerprint to be registered in Firebase. Each keystore (debug, EAS production) has a different SHA-1.

### Platform-Specific Code

This app uses **platform-specific Firebase SDKs**:
- **Web**: Firebase JS SDK (`firebase` package)
- **Mobile**: React Native Firebase (`@react-native-firebase/app`, etc.)

This is necessary because Firebase Web SDK has compatibility issues with React Native.

### Native Modules

After changing native dependencies (like adding React Native Firebase), you MUST rebuild:
```bash
# Clean and rebuild Android
cd android && ./gradlew clean && cd ..
npx expo run:android

# Clean and rebuild iOS
cd ios && pod install && cd ..
npx expo run:ios
```

---

## 🧪 Testing

### Mock Mode

For testing without real API calls, set in `.env`:
```env
MODE=mock
```

This will use mock authentication and mock API responses.

### Production Mode

For real API calls, set:
```env
MODE=prod
```

---

## 📦 Project Structure

```
Tarot_Oracle/
├── android/                 # Android native code
├── ios/                     # iOS native code (if exists)
├── assets/                  # Images, fonts, etc.
├── src/
│   ├── components/          # Reusable React components
│   ├── context/            # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and services
│   │   ├── auth.ts         # Authentication functions
│   │   ├── firebase-config.ts  # Firebase initialization
│   │   └── openai.ts       # OpenAI integration
│   └── screens/            # App screens
├── .env                    # Environment variables (DO NOT COMMIT)
├── app.config.js           # Expo configuration
├── App.tsx                 # App entry point
├── eas.json                # EAS Build configuration
└── package.json            # Dependencies
```

---

## 🐛 Troubleshooting

### "Component auth has not been registered yet"
**Solution:** Make sure Firebase is initialized before any auth calls. This is handled in `App.tsx` with early initialization.

### Google Sign-In "DEVELOPER_ERROR"
**Solution:** 
1. Check SHA-1 is registered in Firebase
2. Verify `google-services.json` is up-to-date
3. Rebuild the app after updating `google-services.json`

### Metro Bundler Issues
**Solution:**
```bash
# Clear cache and restart
npx expo start --clear
```

### Android Build Fails
**Solution:**
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo run:android
```

### iOS Build Fails
**Solution:**
```bash
# Reinstall pods
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

---

## 📝 Development Workflow

1. **Make code changes**
2. **Test locally:**
   ```bash
   npx expo start
   ```
3. **Test on device:**
   - Scan QR code with Expo Go (for Expo SDK apps)
   - Use development build for native modules
4. **Build for production:**
   ```bash
   npx eas build --platform android
   ```
5. **Deploy:**
   - Download and install APK
   - Or submit to app stores

---

## 🔐 Security Reminders

- **Never commit `.env` file** to version control
- Keep `google-services.json` and `GoogleService-Info.plist` private
- Use environment variables for all sensitive keys
- Enable Firestore security rules in production
- Use Firebase Authentication for user management

---

## 📞 Support

For questions or issues:
1. Check this setup guide
2. Review Firebase documentation: [firebase.google.com/docs](https://firebase.google.com/docs)
3. Check Expo documentation: [docs.expo.dev](https://docs.expo.dev)
4. Contact the project maintainer

---

## ✅ Checklist for New Setup

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created with all keys
- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password + Google)
- [ ] Firestore database created
- [ ] `google-services.json` downloaded and placed correctly
- [ ] `GoogleService-Info.plist` downloaded and placed correctly
- [ ] SHA-1 fingerprint added to Firebase
- [ ] EAS account created and logged in
- [ ] App runs successfully in development mode
- [ ] Google Sign-In tested and working

---

**Happy Coding! 🎉**
