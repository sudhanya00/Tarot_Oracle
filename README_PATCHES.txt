Tarot Oracle – Patches applied

• Configured NativeWind v4 properly for Expo SDK 53:
  - Updated babel.config.js to use the NativeWind *preset* and Expo preset.
  - Added @babel/plugin-proposal-export-namespace-from for Reanimated web compatibility.
  - Configured metro.config.js with withNativeWind().
  - Added global.css and imported it in App.tsx.

• Stopped Metro from launching for web:
  - Set { web: { bundler: 'webpack' } } in app.config.js so `npm run web` uses Webpack dev server.

• Firebase wiring:
  - Kept env-driven config in src/lib/firebase.ts via app.config.js -> extra.*.
  - Added .env.example with all keys you need to fill.

• Firestore cost optimization (messages CAP = 25):
  - Rewrote src/hooks/useChats.ts to store messages as an array on the chat doc.
  - Every write trims to last 25 messages to keep reads/writes tiny.
  - Added firestore.rules.example showing how to enforce the cap on the backend.

• Facebook login notes:
  - Added an example AuthSession-based flow in src/lib/auth.ts → signInWithFacebookAsync().
  - You must create a Facebook App (App ID + App Secret) and paste them in Firebase Auth provider.
  - Use MODE=mock until you complete the setup.

• AdMob:
  - Ad unit id is read from extra.ADMOB_BANNER_ID. Use test IDs in dev. Create new App IDs for iOS & Android before release.

Run:
  npm install
  npm run web      # uses Webpack, won’t start Metro
  npm run native   # Metro for iOS/Android

