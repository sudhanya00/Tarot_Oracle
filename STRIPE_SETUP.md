# 💳 Stripe Payment Integration Guide

This guide will help you set up Stripe payments for the Tarot Oracle app.

## 📋 Prerequisites

- Stripe account (https://dashboard.stripe.com/register)
- Firebase project with Cloud Functions enabled
- Blaze plan (pay-as-you-go) required for Cloud Functions

## 🔑 Step 1: Get Stripe Credentials

### 1.1 Create Stripe Account
1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. Activate your account

### 1.2 Get API Keys
1. Go to **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - ⚠️ **NEVER** commit the secret key to git!

### 1.3 Create a Product and Price
1. Go to **Products** → **Add product**
2. Name: "Premium Subscription" (or your choice)
3. Description: "Unlimited tarot readings"
4. Pricing:
   - Type: Recurring
   - Price: $9.99/month (or your choice)
   - Billing period: Monthly
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_`)

## 🔧 Step 2: Configure Environment Variables

### 2.1 Add to `.env` file
```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PRICE_ID=price_your_price_id_here
```

### 2.2 Configure Firebase Functions
```bash
# Set Stripe secret in Firebase Functions config
cd functions
firebase functions:config:set stripe.secret="sk_test_your_secret_key"
firebase functions:config:set stripe.price_id="price_your_price_id"
```

## 📦 Step 3: Deploy Cloud Functions

### 3.1 Install Dependencies
```bash
cd functions
npm install
```

### 3.2 Deploy Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:createStripeCheckoutSession,functions:stripeWebhook
```

## 🪝 Step 4: Set Up Stripe Webhook

### 4.1 Get Webhook Endpoint
After deploying functions, get your webhook URL:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook
```

### 4.2 Add Webhook in Stripe Dashboard
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: (paste your webhook URL from above)
4. Description: "Tarot Oracle subscriptions"
5. **Select events to listen to:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_`)

### 4.3 Configure Webhook Secret
```bash
firebase functions:config:set stripe.webhook_secret="whsec_your_signing_secret"
firebase deploy --only functions:stripeWebhook
```

## 🧪 Step 5: Test the Integration

### 5.1 Update Client Code
Make sure `src/lib/subscriptions.ts` is using the real Stripe flow:

1. Set `MODE=prod` in your `.env` file
2. Or use a test mode with Stripe test keys

### 5.2 Test Purchase Flow
1. Run the app: `npx expo start`
2. Open on your device or emulator
3. Navigate to a chat
4. Try to send a second message
5. Click **Subscribe**
6. Should open Stripe Checkout in browser

### 5.3 Use Test Cards
Stripe provides test card numbers:

**Successful payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Declined payment:**
- Card: `4000 0000 0000 0002`

**More test cards:** https://stripe.com/docs/testing

### 5.4 Verify Subscription
After successful payment:
1. Check Stripe Dashboard → **Customers**
2. Check Firebase Console → **Firestore** → `subscriptions` collection
3. Your user should have `isActive: true`

## 🔐 Step 6: Security Rules

Update `firestore.rules` to protect subscription data:

```javascript
match /subscriptions/{userId} {
  // Users can only read their own subscription
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Only Cloud Functions can write subscriptions
  allow write: if false;
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## 🌐 Step 7: Production Setup

### 7.1 Switch to Live Mode
1. In Stripe Dashboard, toggle **Test mode** OFF
2. Get your **live** API keys (starts with `pk_live_` and `sk_live_`)
3. Update environment variables:
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
   ```
4. Update Firebase Functions config:
   ```bash
   firebase functions:config:set stripe.secret="sk_live_your_live_key"
   firebase deploy --only functions
   ```

### 7.2 Update Webhook
1. Create a new webhook endpoint for production
2. Use your production Cloud Functions URL
3. Update webhook secret in Firebase config

### 7.3 Update Success/Cancel URLs
In `functions/src/index.ts`, update the URLs:
```typescript
success_url: `yourapp://success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `yourapp://cancel`,
```

## 📊 Monitoring

### Check Stripe Dashboard
- **Home** - Overview of payments
- **Payments** - Individual transactions
- **Customers** - Customer list
- **Subscriptions** - Active subscriptions
- **Logs** → **Webhooks** - Webhook delivery logs

### Check Firebase Logs
```bash
firebase functions:log
```

Or in Firebase Console: **Functions** → Select function → **Logs**

## 🐛 Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is correct
2. Verify endpoint is deployed: `firebase functions:list`
3. Check webhook logs in Stripe Dashboard
4. Verify signing secret is configured correctly

### Subscription Not Activating
1. Check Firebase Functions logs: `firebase functions:log`
2. Verify webhook events are being received
3. Check Firestore security rules allow writes
4. Verify user ID is being passed correctly

### Payment Failing
1. Check Stripe test card numbers are correct
2. Verify API keys are valid (test keys for testing)
3. Check Firebase Functions logs for errors
4. Ensure product/price exists in Stripe

## 💡 Tips

1. **Always test in test mode** before going live
2. **Monitor webhook delivery** in Stripe Dashboard
3. **Check Cloud Functions logs** for errors
4. **Use Stripe CLI** for local testing: https://stripe.com/docs/stripe-cli
5. **Set up email receipts** in Stripe Dashboard → **Settings** → **Emails**

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing)

## 🎯 Current Status

- ✅ Cloud Functions code implemented
- ✅ Client-side integration ready
- ⏳ Needs Stripe account setup
- ⏳ Needs Firebase Functions deployment
- ⏳ Needs webhook configuration

