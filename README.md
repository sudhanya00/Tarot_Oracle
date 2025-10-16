# 🔮 Tarot Oracle

A mystical React Native app built with Expo that provides AI-powered tarot readings and spiritual guidance.

## ✨ Features

- 🎴 **AI-Powered Tarot Readings** - Get personalized tarot readings powered by OpenAI
- 🔐 **Secure Authentication** - Email/password and Google Sign-In with Firebase
- 💬 **Interactive Chat** - Conversational interface for asking questions
- 💳 **Subscription Management** - Stripe integration for premium features
- 📱 **Cross-Platform** - Works on iOS, Android, and Web
- 🎨 **Beautiful UI** - Modern, mystical design with NativeWind (Tailwind CSS)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npx expo start
```

For detailed setup instructions, see **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions for new developers
- **[FIREBASE_ARCHITECTURE.md](./FIREBASE_ARCHITECTURE.md)** - Firebase & Google Sign-In implementation details
- **[QUICK_START.md](./QUICK_START.md)** - Cheat sheet for common commands and troubleshooting

## 🛠️ Tech Stack

### Core
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type-safe JavaScript

### UI
- **NativeWind** - Tailwind CSS for React Native
- **React Navigation** - Navigation and routing

### Backend Services
- **Firebase Authentication** - User management
  - Web: Firebase JS SDK
  - Mobile: React Native Firebase
- **Firestore** - NoSQL database
- **OpenAI API** - AI-powered readings
- **Stripe** - Payment processing
- **AdMob** - Advertising

### Build & Deploy
- **EAS Build** - Cloud build service
- **Expo Dev Client** - Custom development builds

## 📱 Supported Platforms

- ✅ **Android** - Native Google Sign-In, full functionality
- ✅ **iOS** - Full functionality (requires macOS for development)
- ⚠️ **Web** - Limited functionality (Google Sign-In may have issues)

## 🔑 Configuration Required

Before running the app, you need to configure:

1. **Firebase** - Authentication and database
   - Create Firebase project
   - Enable Email/Password and Google authentication
   - Create Firestore database
   - Download config files

2. **OpenAI** - AI-powered readings
   - Get API key from platform.openai.com

3. **Stripe** - Payment processing (optional)
   - Get publishable key from dashboard

4. **AdMob** - Advertising (optional)
   - Create AdMob account and app
   - Get app IDs and ad unit IDs

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## 🏗️ Project Structure

```
Tarot_Oracle/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Base UI components (button, card, input)
│   │   ├── ChatInputGate.tsx
│   │   └── SubscribeButton.tsx
│   ├── context/         # React Context providers
│   │   ├── AuthProvider.tsx
│   │   └── SubscriptionProvider.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useChats.ts
│   ├── lib/             # Utilities and services
│   │   ├── auth.ts              # Authentication functions
│   │   ├── firebase-config.ts   # Platform-specific Firebase init
│   │   ├── openai.ts            # OpenAI integration
│   │   ├── subscriptions.ts     # Stripe integration
│   │   └── admob.tsx            # AdMob banner component
│   └── screens/         # App screens
│       ├── WelcomeScreen.tsx
│       ├── LoginScreen.tsx
│       ├── DashboardScreen.tsx
│       └── ChatScreen.tsx
├── android/             # Android native code
├── assets/              # Images, fonts, etc.
├── App.tsx              # App entry point
├── app.config.js        # Expo configuration
└── eas.json            # EAS Build configuration
```

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Running Locally

```bash
# Start Metro bundler
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (macOS only)
npx expo run:ios

# Run on Web
npx expo start --web
```

### Building for Production

```bash
# Login to EAS
npx eas login

# Build Android APK
npx eas build --profile production --platform android

# Build iOS IPA
npx eas build --profile production --platform ios
```

## 🐛 Common Issues

### Google Sign-In "DEVELOPER_ERROR"

**Problem**: Google Sign-In fails with DEVELOPER_ERROR on Android

**Solution**:
1. Get SHA-1 fingerprint from your keystore
2. Add it to Firebase Console
3. Download updated `google-services.json`
4. Replace in project (root and `android/app/`)
5. **Rebuild the app** (not just reload)

See [FIREBASE_ARCHITECTURE.md](./FIREBASE_ARCHITECTURE.md) for details.

### Firebase Auth Issues

**Problem**: "Component auth has not been registered yet"

**Solution**:
- Make sure Firebase initializes before any auth calls
- Check `App.tsx` has Firebase initialization
- Wait for `firebaseReady` state before rendering auth-dependent components

### Build Failures

**Problem**: EAS build fails or app crashes after build

**Solution**:
```bash
# Clear caches
npx expo start --clear

# Clean Android
cd android && ./gradlew clean && cd ..

# Reinstall dependencies
rm -rf node_modules
npm install
```

## 🔐 Security

- Never commit `.env` file
- Keep `google-services.json` and `GoogleService-Info.plist` private
- Use environment variables for all API keys
- Enable Firestore security rules in production
- Restrict API keys in Google Cloud Console

## 📝 Environment Variables

Required variables in `.env`:

```env
# OpenAI
OPENAI_API_KEY=your_key_here

# Firebase
FIREBASE_API_KEY=your_key_here
FIREBASE_PROJECT_ID=your_project_id
GOOGLE_WEB_CLIENT_ID=your_client_id

# Stripe (optional)
STRIPE_PUBLISHABLE_KEY=your_key_here

# AdMob (optional)
ADMOB_APP_ID_ANDROID=ca-app-pub-xxxxx
ADMOB_BANNER_ID=ca-app-pub-xxxxx

# Mode
MODE=prod  # or 'mock' for testing
```

See `.env.example` for complete template.

## 🤝 Contributing

1. Clone the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (Android, iOS, Web)
5. Submit a pull request

## 📄 License

[Your License Here]

## 📞 Support

For setup help, see:
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup guide
- [FIREBASE_ARCHITECTURE.md](./FIREBASE_ARCHITECTURE.md) - Firebase details
- [QUICK_START.md](./QUICK_START.md) - Quick reference

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- UI powered by [NativeWind](https://www.nativewind.dev/)
- AI by [OpenAI](https://openai.com/)
- Backend by [Firebase](https://firebase.google.com/)
- Payments by [Stripe](https://stripe.com/)

---

**Made with ✨ and 🔮**
