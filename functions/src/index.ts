import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {defineString} from "firebase-functions/params";
import * as admin from "firebase-admin";
import StripePkg from "stripe";
import cors from "cors";

const corsHandler = cors({ origin: true });
admin.initializeApp();

export {oracleReply} from "./oracle";

// Define parameters for runtime config
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");
// Pricing: $3 one-time Day Pass (24h of access, stackable) and $30/month subscription.
const stripePriceIdDay = defineString("STRIPE_PRICE_ID_DAY", {default: ""});
const stripePriceIdMonth = defineString("STRIPE_PRICE_ID_MONTH", {default: ""});
// Legacy single price, used as the monthly price until STRIPE_PRICE_ID_MONTH is set.
const stripePriceId = defineString("STRIPE_PRICE_ID", {default: ""});
const checkoutSuccessUrl = defineString("CHECKOUT_SUCCESS_URL", {
  default: "https://tarotoracleapp.com/checkout-success?session_id={CHECKOUT_SESSION_ID}",
});
const checkoutCancelUrl = defineString("CHECKOUT_CANCEL_URL", {
  default: "https://tarotoracleapp.com/checkout-cancelled",
});

type Plan = "day" | "month";

const DAY_PASS_MS = 24 * 60 * 60 * 1000;
// Covers the gap between a period ending and Stripe's renewal webhook arriving.
const RENEWAL_GRACE_MS = 6 * 60 * 60 * 1000;

// Initialize Stripe (will use runtime config)
const getStripe = () => {
  const secret = stripeSecretKey.value();
  if (!secret) {
    throw new Error("Stripe secret key not configured");
  }
  return new StripePkg(secret, { apiVersion: "2026-06-24.dahlia" as any });
};

const priceIdFor = (plan: Plan): string => {
  const id = plan === "day" ?
    stripePriceIdDay.value() :
    stripePriceIdMonth.value() || stripePriceId.value();
  if (!id) {
    throw new HttpsError("failed-precondition", `No Stripe price configured for the ${plan} plan.`);
  }
  return id;
};

// current_period_end moved from the subscription to its items in newer Stripe API versions.
const periodEndMs = (subscription: StripePkg.Subscription): number => {
  const sub = subscription as any;
  const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? 0;
  return end * 1000;
};

type EntitlementState = {
  dayPassExpiresAt?: number;
  monthlyActive?: boolean;
  monthlyPeriodEnd?: number;
};

// Derives the fields the app reads (isActive / expiresAt / plan) from both purchase types,
// so a cancelled subscription never wipes out Day Pass time that is still left.
const entitlementFields = (state: EntitlementState) => {
  const now = Date.now();
  const dayUntil = state.dayPassExpiresAt || 0;
  const monthUntil = state.monthlyActive ? (state.monthlyPeriodEnd || 0) + RENEWAL_GRACE_MS : 0;
  const expiresAt = Math.max(dayUntil, monthUntil);
  const plan: Plan | null = monthUntil > now ? "month" : dayUntil > now ? "day" : null;
  return {
    ...state,
    isActive: expiresAt > now,
    expiresAt,
    plan,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
};

const subscriptionRef = (userId: string) => admin.firestore().collection("subscriptions").doc(userId);

// Records the monthly subscription state for a user and recomputes their access.
const applyMonthly = async (userId: string, subscription: StripePkg.Subscription) => {
  const ref = subscriptionRef(userId);
  await admin.firestore().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() || {};
    tx.set(ref, {
      ...entitlementFields({
        dayPassExpiresAt: current.dayPassExpiresAt,
        monthlyActive: subscription.status === "active" || subscription.status === "trialing",
        monthlyPeriodEnd: periodEndMs(subscription),
      }),
      status: subscription.status,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
    }, { merge: true });
  });
};

// Adds 24h to the user's Day Pass (stacking on top of any time left), once per Checkout Session.
const applyDayPass = async (userId: string, session: StripePkg.Checkout.Session) => {
  const db = admin.firestore();
  const ref = subscriptionRef(userId);
  const receiptRef = db.collection("stripe_checkout_sessions").doc(session.id);

  await db.runTransaction(async (tx) => {
    const [receipt, snap] = await Promise.all([tx.get(receiptRef), tx.get(ref)]);
    if (receipt.exists) return; // Stripe retried the webhook; already credited.

    const current = snap.data() || {};
    const base = Math.max(Date.now(), current.dayPassExpiresAt || 0);
    tx.set(ref, {
      ...entitlementFields({
        dayPassExpiresAt: base + DAY_PASS_MS,
        monthlyActive: current.monthlyActive,
        monthlyPeriodEnd: current.monthlyPeriodEnd,
      }),
      stripeCustomerId: session.customer || current.stripeCustomerId || null,
    }, { merge: true });
    tx.set(receiptRef, {
      userId,
      plan: "day",
      amountTotal: session.amount_total,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};

// Firebase Callable Function: Create Stripe Checkout Session for a plan ("day" or "month")
export const createStripeCheckoutSession = onCall(async (request) => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to start a purchase.");
  }

  const plan: Plan = request.data?.plan === "day" ? "day" : "month";
  const userId = request.auth.uid;
  const stripe = getStripe();
  const metadata = { userId, plan };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: plan === "day" ? "payment" : "subscription",
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      customer_email: request.auth.token.email,
      client_reference_id: userId,
      success_url: checkoutSuccessUrl.value(),
      cancel_url: checkoutCancelUrl.value(),
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata,
      ...(plan === "day" ?
        { payment_intent_data: { metadata } } :
        { subscription_data: { metadata } }),
    });

    console.log("Created Stripe Checkout session:", session.id, "plan:", plan, "user:", userId);

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    console.error("Error creating Stripe Checkout session:", error);
    throw new HttpsError("internal", `Failed to create checkout session: ${error.message}`);
  }
});

// Webhook to handle Day Pass payments and subscription lifecycle events
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET", {default: ""});

export const stripeWebhook = onRequest(async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = stripeWebhookSecret.value();

  if (!sig || !webhookSecret) {
    res.status(400).send("Missing signature or endpoint secret");
    return;
  }

  let event: StripePkg.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as StripePkg.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        console.log("[stripe] checkout.session.completed", session.id, "mode:", session.mode);

        if (!userId || session.payment_status !== "paid") break;

        if (session.mode === "payment" && session.metadata?.plan === "day") {
          await applyDayPass(userId, session);
          console.log("[stripe] Credited 24h Day Pass for user:", userId);
        } else if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" ?
            session.subscription :
            session.subscription.id;
          await applyMonthly(userId, await stripe.subscriptions.retrieve(subscriptionId));
          console.log("[stripe] Activated monthly plan for user:", userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as StripePkg.Subscription;
        const userId = subscription.metadata?.userId;
        console.log("[stripe] subscription event", event.type, subscription.id, subscription.status);
        if (userId) {
          await applyMonthly(userId, subscription);
        }
        break;
      }
      default:
        console.log(`[stripe] unhandled event: ${event.type}`);
    }
  } catch (error) {
    // A 500 makes Stripe retry, and the handlers above are safe to re-run.
    console.error("[stripe] Error handling event:", event.type, error);
    res.status(500).send("Webhook handler failed");
    return;
  }

  res.json({ received: true });
});

// Permanently deletes the caller's account (required by the App Store for apps with sign-up):
// stops any monthly billing, then removes their profile, readings, usage and plan, and the
// Firebase Auth user. Checkout receipts in stripe_checkout_sessions are kept as payment records.
export const deleteAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();
  const planRef = subscriptionRef(uid);

  // Older plan docs (from the previous webhook) only have stripeSubscriptionId, so ask Stripe.
  const subscriptionId = (await planRef.get()).get("stripeSubscriptionId");
  if (subscriptionId) {
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!["canceled", "incomplete_expired"].includes(subscription.status)) {
        await stripe.subscriptions.cancel(subscriptionId);
      }
    } catch (error: any) {
      // A subscription Stripe no longer knows about is fine; anything else must stop the
      // deletion so billing doesn't continue for an account that no longer exists.
      if (error?.code !== "resource_missing") {
        console.error("[deleteAccount] Could not cancel subscription:", error);
        throw new HttpsError("internal", "Could not cancel your subscription. Please try again.");
      }
    }
  }

  await db.recursiveDelete(db.collection("users").doc(uid)); // profile + chats subcollection
  await Promise.all([planRef.delete(), db.collection("usage").doc(uid).delete()]);
  await admin.auth().deleteUser(uid);

  console.log("[deleteAccount] Deleted account:", uid);
  return { ok: true };
});

// (Optional) Callable to prune chat messages server-side to <=25 for cost control
export const trimChatMessages = onCall(async (request) => {
  const { chatId } = request.data || {};
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  if (!chatId) {
    throw new HttpsError("invalid-argument", "chatId missing.");
  }

  const db = admin.firestore();
  const chatRef = db.collection("chats").doc(chatId);
  const snap = await chatRef.get();
  if (!snap.exists) return { ok: true, trimmed: 0 };

  const messages: any[] = (snap.get("messages") as any[]) || [];
  if (messages.length <= 25) return { ok: true, trimmed: 0 };

  const trimmed = messages.slice(-25);
  await chatRef.update({ messages: trimmed });
  return { ok: true, trimmed: messages.length - 25 };
});

// Test function to add subscription for specific users (for development/testing)
export const addTestSubscription = onCall(async (request) => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const db = admin.firestore();
  const userId = request.auth.uid;
  
  // Allowed test emails (your emails)
  const allowedEmails = [
    'sudhanyakhajuria@outlook.com',
    'sudhanyak357@gmail.com'
  ];
  
  const userEmail = request.auth.token.email;
  
  if (!userEmail || !allowedEmails.includes(userEmail)) {
    throw new HttpsError("permission-denied", "This function is only available for test users.");
  }

  try {
    await db.collection('subscriptions').doc(userId).set({
      isActive: true,
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      customerId: 'test-customer-' + userId,
      subscriptionId: 'test-sub-' + userId,
      priceId: 'test-price',
      status: 'active',
      email: userEmail,
      note: '⚡ Test subscription - added via addTestSubscription function'
    }, { merge: true });

    return { success: true, message: `Test subscription activated for ${userEmail}` };
  } catch (error: any) {
    console.error('Error adding test subscription:', error);
    throw new HttpsError("internal", `Failed to add subscription: ${error.message}`);
  }
});
