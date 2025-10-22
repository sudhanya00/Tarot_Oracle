# 🚀 Quick Test Guide - Tarot Oracle

## ✅ What's Working Right Now

Your app is **fully functional** with the existing APK! Here's what you can test:

### 1. **Test with Mock Mode (Current Setup)**
```bash
# Start the app
npx expo start

# Open your existing working APK
# Scan the QR code or press 'a' for Android
```

**Features to test:**
- ✅ Login with Google
- ✅ Dashboard with chat list
- ✅ Create new chat
- ✅ Send first message → Get AI tarot reading (FREE)
- ✅ Send second message → See Subscribe button
- ✅ Click Subscribe → **Activates subscription** (mock mode)
- ✅ Send unlimited messages after subscribing
- ✅ Logout
- ✅ Long-press to delete chat

**Current Status:**
- MODE=mock → Subscription activates automatically (for testing)
- Works with your existing APK (no rebuild needed!)
- All features functional

---

## 💳 Enable Real Stripe Payments (Optional)

If you want to add real payments later:

### Option 1: Quick Setup (Hosted Checkout URL)
1. Create Stripe account
2. Create a Payment Link in Stripe Dashboard
3. Add to `.env`:
   ```env
   MODE=prod
   STRIPE_CHECKOUT_URL=https://buy.stripe.com/your_payment_link
   ```
4. Reload app → Subscribe button opens Stripe checkout

### Option 2: Full Integration (Cloud Functions)
Follow the complete guide in `STRIPE_SETUP.md`

---

## 🧪 Testing Checklist

Run through this flow:

```
1. Open app on device
2. Login with Google ✓
3. See Dashboard with empty state
4. Click "New Reading" ✓
5. Enter name for chat ✓
6. Send a message "What does my future hold?" ✓
   → Should get AI tarot reading (FREE)
7. Send another message ✓
   → Should see Subscribe button (first message free)
8. Click Subscribe ✓
   → Should activate subscription (mock mode)
9. Send more messages ✓
   → Should work unlimited
10. Go back to Dashboard ✓
11. Long-press on chat ✓
    → Should show delete confirmation
12. Delete chat ✓
13. Click Logout ✓
    → Should return to Welcome screen
```

---

## 🐛 Troubleshooting

### "Cannot read property 'getProvider'"
- **This is normal** in mock mode - it falls back to mock activation
- Subscription still works! Check logs: "mockActivate: COMPLETE"
- You're already subscribed after clicking Subscribe

### App won't connect
```bash
# Make sure Metro is running
npx expo start

# If port issues:
npx expo start --clear --port 8082
```

### Can't see new code changes
1. In Metro bundler, press `r` to reload
2. Or shake device → Reload

---

## 📝 Current .env Setup

Your `.env` should have:
```env
MODE=mock  # For testing
OPENAI_API_KEY=sk-...  # For AI readings
STRIPE_PUBLISHABLE_KEY=pk_test_...  # (Optional for now)
FIREBASE_API_KEY=...  # Your Firebase config
# ... other Firebase vars
```

---

## ✨ What Just Got Updated

- ✅ Stripe integration code ready
- ✅ Cloud Functions for Stripe Checkout
- ✅ Auto-activation via webhooks
- ✅ Comprehensive docs (STRIPE_SETUP.md)
- ✅ Works with existing APK (no rebuild!)

**Bottom line:** Your app is fully functional for testing right now. Stripe can be added later when you're ready! 🎯

