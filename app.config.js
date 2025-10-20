// app.config.js
import "dotenv/config";

export default () => ({
  expo: {
    name: "Tarot_Oracle",
    slug: "Tarot_Oracle",
    owner: "itsjkjass",  // TODO: Change to your Expo username when setting up
    scheme: "tarotoracle",
    platforms: ["ios", "android", "web"],
    web: {bundler: "metro"},

    // Configure for Android
    android: {
      package: "com.tarotoracle.app",
      googleServicesFile: "./google-services.json",
      permissions: ["android.permission.INTERNET"],
      // Disable New Architecture to avoid C++ linker errors
      newArchEnabled: false
    },
    ios: {
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
      bundleIdentifier: "com.tarotoracle.app"
    },

    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
      ADMOB_BANNER_ID: process.env.ADMOB_BANNER_ID || "",
      ADMOB_APP_ID_ANDROID: process.env.ADMOB_APP_ID_ANDROID || "",
      ADMOB_APP_ID_IOS: process.env.ADMOB_APP_ID_IOS || "",
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || "",
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || "",
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "",
      FIREBASE_MESSAGING_SENDER_ID:
        process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      FIREBASE_APP_ID_WEB: process.env.FIREBASE_APP_ID_WEB || process.env.FIREBASE_APP_ID || "",
      FIREBASE_APP_ID_IOS: process.env.FIREBASE_APP_ID_IOS || process.env.FIREBASE_APP_ID || "",
      FIREBASE_APP_ID_ANDROID: process.env.FIREBASE_APP_ID_ANDROID || process.env.FIREBASE_APP_ID || "",
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID || "",
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID || "",
      MODE: process.env.MODE || "mock",
      // optional hosted URLs if you wire Stripe server later
      STRIPE_CHECKOUT_URL: process.env.STRIPE_CHECKOUT_URL || "",
      STRIPE_PORTAL_URL: process.env.STRIPE_PORTAL_URL || "",
      // EAS project ID
      eas: {
        projectId: "30d891eb-23dd-498b-962b-7fc803245e8a"
      }
    },

    // ✅ Explicit plugin list (prevents Expo from asking you later)
    plugins: [
      "expo-web-browser",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.1036422879083-bu2ec221p9ddu099ls32p55jtj71jnv8" 
        }
      ],
      "./plugins/withGoogleServices.js",
      [
        "@react-native-firebase/app",
        {
          "android": {
            "googleServicesFile": "./google-services.json"
          },
          "ios": {
            "googleServicesFile": "./GoogleService-Info.plist"
          }
        }
      ]
    ],
  },
});
