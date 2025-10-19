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
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      permissions: ["android.permission.INTERNET"]
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
      "expo-web-browser",          // used in subscriptions.ts
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID" 
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.ADMOB_APP_ID_ANDROID || "ca-app-pub-3940256099942544~3347511713", // Test ID as fallback
          iosAppId: process.env.ADMOB_APP_ID_IOS || "ca-app-pub-3940256099942544~1458002511" // Test ID as fallback
        }
      ]
    ],
  },
});
