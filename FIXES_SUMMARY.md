# Fixes Applied - October 21, 2025

## ✅ Issues Fixed

### 1. Email/Password Auth Error ("cannot read property 'code' of undefined")
**Problem:** React Native Firebase returns different error structure than Firebase Web SDK
**Solution:** Added proper error handling in `src/lib/auth.ts`:
- Wrapped `emailSignIn()` and `emailSignUp()` in try-catch blocks
- Check both `error.code` and error message for Firebase error codes
- Provide user-friendly error messages for common errors:
  - `auth/user-not-found` → "No account found with this email."
  - `auth/wrong-password` → "Incorrect password."
  - `auth/email-already-in-use` → "This email is already registered."
  - `auth/weak-password` → "Password should be at least 6 characters."
  - `auth/invalid-email` → "Invalid email address."

### 2. Stripe Subscription (Enlighten Button) Not Working
**Problem:** Missing Stripe environment variables in EAS, causing app to fall back to mock activation
**Solution:** Added all Stripe environment variables to EAS preview profile:
- `STRIPE_PUBLISHABLE_KEY` → Client-side publishable key
- `STRIPE_PRICE_ID` → Subscription price ID
- Updated `app.config.js` to read `STRIPE_PRICE_ID`

### 3. Missing Environment Variables
**Added to EAS preview environment:**
- ✅ STRIPE_PUBLISHABLE_KEY
- ✅ STRIPE_PRICE_ID
- ✅ ADMOB_APP_ID_ANDROID
- ✅ ADMOB_APP_ID_IOS
- ✅ ADMOB_BANNER_ID
- ✅ FIREBASE_APP_ID_WEB
- ✅ FIREBASE_APP_ID_IOS
- ✅ FIREBASE_CLIENT_ID

**Previously set:**
- OPENAI_API_KEY
- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_PROJECT_ID
- FIREBASE_STORAGE_BUCKET
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID
- FIREBASE_APP_ID_ANDROID
- FIREBASE_MEASUREMENT_ID
- GOOGLE_WEB_CLIENT_ID

## 📦 Latest Build Available

**Build ID:** 5ad2b9cb-b933-43e4-b939-69ac07fa8c80
**Download:** https://expo.dev/accounts/sudhanya/projects/Tarot_Oracle/builds/5ad2b9cb-b933-43e4-b939-69ac07fa8c80

**This build includes:**
- ✅ Fixed email/password auth error handling
- ✅ All environment variables (except Stripe webhook still needs Cloud Function deployment)
- ✅ MODE=prod (real Firebase, OpenAI, partial Stripe)

## ⚠️ Remaining Issue: Stripe Payments

### Problem
The Stripe subscription flow requires a deployed Firebase Cloud Function to create checkout sessions.

### Current Behavior
When you click "Enlighten 🔮", the app checks for:
1. `STRIPE_CHECKOUT_URL` (not set) - Would directly open a hosted checkout page
2. `STRIPE_PUBLISHABLE_KEY` (✅ set) - Tries to call Cloud Function `createStripeCheckoutSession`
3. If Cloud Function fails → Falls back to `mockActivate()` (auto-activates subscription)

### Why It Falls Back to Mock
The Cloud Function `createStripeCheckoutSession` exists in `functions/src/index.ts` but **is not deployed** yet, OR it's deployed but missing the `STRIPE_SECRET_KEY` secret.

## 🚀 Next Steps to Enable Real Stripe Payments

### Step 1: Deploy Firebase Cloud Functions

```powershell
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Step 2: Set Stripe Secret Key in Firebase

```powershell
firebase functions:secrets:set STRIPE_SECRET_KEY
```

When prompted, enter your Stripe secret key: `sk_live_...` (from your Stripe Dashboard)

### Step 3: Set Stripe Price ID (Optional)

```powershell
firebase functions:config:set stripe.price_id="price_1Rrp7ZHjNbUwdLx2q2Pqofvn"
firebase deploy --only functions
```

### Step 4: Test & Rebuild

After deploying functions:
1. Test that the Cloud Function works by clicking "Enlighten 🔮" in the current APK
2. If it works, great! No rebuild needed.
3. If not, check Firebase Functions logs: `firebase functions:log`

### Step 5: (Optional) Set Up Stripe Webhook

For production, set up a Stripe webhook to handle subscription lifecycle:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook`
3. Select events: `checkout.session.completed`, `customer.subscription.*`
4. Copy webhook signing secret
5. Set it in Firebase:
   ```powershell
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```
6. Redeploy functions: `firebase deploy --only functions`

## 📝 Testing Checklist

### After Current Build (5ad2b9cb-b933-43e4-b939-69ac07fa8c80)
- [x] Google Sign-In works
- [x] OpenAI chat works
- [ ] Email/Password login (test error messages)
- [ ] Email/Password signup (test error messages)
- [ ] Stripe subscription (will fall back to mock activation until Cloud Function deployed)

### After Cloud Function Deployment (Future Build)
- [ ] Stripe checkout opens in browser
- [ ] After payment, subscription activates in Firestore
- [ ] App recognizes active subscription (canChat = true)
- [ ] Subscription webhook handles lifecycle events

## 📊 EAS Build Quota

**Important:** You mentioned low EAS build quota. 

**Current Status:**
- Free tier: 30 builds/month
- You've used several builds today

**Recommendation:**
1. Download and test the current build (5ad2b9cb-b933-43e4-b939-69ac07fa8c80)
2. Deploy Cloud Functions WITHOUT rebuilding
3. Test Stripe in the current build (functions are called at runtime, no rebuild needed)
4. Only rebuild if you find code bugs that need fixing

## 🎯 Summary

**What's Working:**
- ✅ Google Sign-In
- ✅ OpenAI tarot readings
- ✅ Firestore chat persistence
- ✅ All environment variables set in EAS

**What Needs Work:**
- ⚠️ Email/password auth (fixed in code, needs testing)
- ⚠️ Stripe payments (needs Cloud Function deployment)

**No Rebuild Needed For:**
- Environment variable changes (already set in EAS)
- Cloud Function deployment (functions called at runtime)

**Rebuild Only If:**
- You find bugs in the current APK
- You need to update code logic
- You want to test the fixed email/password auth error messages

