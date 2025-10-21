// app.config.js
import "dotenv/config";

export default () => ({
  expo: {
    name: "Tarot_Oracle",
    slug: "Tarot_Oracle",
    owner: "sudhanyak",
    scheme: "tarotoracle",
    platforms: ["ios", "android", "web"],
    web: {bundler: "metro"},
    
    // App Icon
    icon: "./assets/images/hooded_oracle.png",
    
    // Adaptive Icon for Android (uses same image)
    adaptiveIcon: {
      foregroundImage: "./assets/images/hooded_oracle.png",
      backgroundColor: "#000000"
    },
    
    // Splash Screen
    splash: {
      image: "./assets/images/hooded_oracle.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },

    // Configure for Android
    android: {
      package: "com.tarotoracle.app",
      googleServicesFile: "./google-services.json",
      permissions: ["android.permission.INTERNET"],
      // Enable New Architecture for React Native Reanimated 4.x
      newArchEnabled: true
    },
    ios: {
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || "./GoogleService-Info.plist",
      bundleIdentifier: "com.tarotoracle.app",
      // Enable New Architecture for React Native Reanimated 4.x
      newArchEnabled: true
    },

    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
      STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || "",
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
        projectId: "b8b03029-ed5d-4c78-9c7a-a0743f97aae4"
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
      ],
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-2534446887487052~2032082918",
          "iosAppId": "ca-app-pub-2534446887487052~2554827090"
        }
      ]
    ],
  },
});
