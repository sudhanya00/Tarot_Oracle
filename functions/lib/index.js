"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTestSubscription = exports.trimChatMessages = exports.deleteAccount = exports.stripeWebhook = exports.createStripeCheckoutSession = exports.checkoutReturn = exports.oracleReply = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const cors_1 = __importDefault(require("cors"));
const corsHandler = (0, cors_1.default)({ origin: true });
admin.initializeApp();
var oracle_1 = require("./oracle");
Object.defineProperty(exports, "oracleReply", { enumerable: true, get: function () { return oracle_1.oracleReply; } });
var checkoutReturn_1 = require("./checkoutReturn");
Object.defineProperty(exports, "checkoutReturn", { enumerable: true, get: function () { return checkoutReturn_1.checkoutReturn; } });
// Define parameters for runtime config
// Secrets live in Secret Manager: firebase functions:secrets:set <NAME>
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
// Pricing: $3 one-time Day Pass (24h of access, stackable) and $30/month subscription.
const stripePriceIdDay = (0, params_1.defineString)("STRIPE_PRICE_ID_DAY", { default: "" });
const stripePriceIdMonth = (0, params_1.defineString)("STRIPE_PRICE_ID_MONTH", { default: "" });
// Legacy single price, used as the monthly price until STRIPE_PRICE_ID_MONTH is set.
const stripePriceId = (0, params_1.defineString)("STRIPE_PRICE_ID", { default: "" });
// Optional overrides; by default Checkout returns to the checkoutReturn function's page.
const checkoutSuccessUrl = (0, params_1.defineString)("CHECKOUT_SUCCESS_URL", { default: "" });
const checkoutCancelUrl = (0, params_1.defineString)("CHECKOUT_CANCEL_URL", { default: "" });
const checkoutReturnUrl = (status) => `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/checkoutReturn?status=${status}`;
const DAY_PASS_MS = 24 * 60 * 60 * 1000;
// Covers the gap between a period ending and Stripe's renewal webhook arriving.
const RENEWAL_GRACE_MS = 6 * 60 * 60 * 1000;
// Initialize Stripe (will use runtime config)
const getStripe = () => {
    const secret = stripeSecretKey.value();
    if (!secret) {
        throw new Error("Stripe secret key not configured");
    }
    return new stripe_1.default(secret, { apiVersion: "2026-06-24.dahlia" });
};
const priceIdFor = (plan) => {
    const id = plan === "day" ?
        stripePriceIdDay.value() :
        stripePriceIdMonth.value() || stripePriceId.value();
    if (!id) {
        throw new https_1.HttpsError("failed-precondition", `No Stripe price configured for the ${plan} plan.`);
    }
    return id;
};
// current_period_end moved from the subscription to its items in newer Stripe API versions.
const periodEndMs = (subscription) => {
    const sub = subscription;
    const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? 0;
    return end * 1000;
};
// Derives the fields the app reads (isActive / expiresAt / plan) from both purchase types,
// so a cancelled subscription never wipes out Day Pass time that is still left.
const entitlementFields = (state) => {
    const now = Date.now();
    const dayUntil = state.dayPassExpiresAt || 0;
    const monthUntil = state.monthlyActive ? (state.monthlyPeriodEnd || 0) + RENEWAL_GRACE_MS : 0;
    const expiresAt = Math.max(dayUntil, monthUntil);
    const plan = monthUntil > now ? "month" : dayUntil > now ? "day" : null;
    return {
        ...state,
        isActive: expiresAt > now,
        expiresAt,
        plan,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
};
const subscriptionRef = (userId) => admin.firestore().collection("subscriptions").doc(userId);
const userIdForSubscription = async (subscriptionId) => {
    const match = await admin.firestore().collection("subscriptions")
        .where("stripeSubscriptionId", "==", subscriptionId)
        .limit(1)
        .get();
    return match.empty ? undefined : match.docs[0].id;
};
// Records the monthly subscription state for a user and recomputes their access.
const applyMonthly = async (userId, subscription) => {
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
const applyDayPass = async (userId, session) => {
    const db = admin.firestore();
    const ref = subscriptionRef(userId);
    const receiptRef = db.collection("stripe_checkout_sessions").doc(session.id);
    await db.runTransaction(async (tx) => {
        const [receipt, snap] = await Promise.all([tx.get(receiptRef), tx.get(ref)]);
        if (receipt.exists)
            return; // Stripe retried the webhook; already credited.
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
exports.createStripeCheckoutSession = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    // Require authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to start a purchase.");
    }
    const plan = request.data?.plan === "day" ? "day" : "month";
    const userId = request.auth.uid;
    const stripe = getStripe();
    const metadata = { userId, plan };
    try {
        const session = await stripe.checkout.sessions.create({
            mode: plan === "day" ? "payment" : "subscription",
            line_items: [{ price: priceIdFor(plan), quantity: 1 }],
            customer_email: request.auth.token.email,
            client_reference_id: userId,
            success_url: checkoutSuccessUrl.value() || checkoutReturnUrl("success"),
            cancel_url: checkoutCancelUrl.value() || checkoutReturnUrl("cancelled"),
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
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error("Error creating Stripe Checkout session:", error);
        throw new https_1.HttpsError("internal", `Failed to create checkout session: ${error.message}`);
    }
});
// Webhook to handle Day Pass payments and subscription lifecycle events
const stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
exports.stripeWebhook = (0, https_1.onRequest)({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = stripeWebhookSecret.value();
    if (!sig || !webhookSecret) {
        res.status(400).send("Missing signature or endpoint secret");
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const userId = session.metadata?.userId || session.client_reference_id;
                console.log("[stripe] checkout.session.completed", session.id, "mode:", session.mode);
                if (!userId || session.payment_status !== "paid")
                    break;
                if (session.mode === "payment" && session.metadata?.plan === "day") {
                    await applyDayPass(userId, session);
                    console.log("[stripe] Credited 24h Day Pass for user:", userId);
                }
                else if (session.mode === "subscription" && session.subscription) {
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
                const subscription = event.data.object;
                // Subscriptions from the old checkout have no userId metadata; find them by ID instead.
                const userId = subscription.metadata?.userId || await userIdForSubscription(subscription.id);
                console.log("[stripe] subscription event", event.type, subscription.id, subscription.status);
                if (userId) {
                    await applyMonthly(userId, subscription);
                }
                break;
            }
            default:
                console.log(`[stripe] unhandled event: ${event.type}`);
        }
    }
    catch (error) {
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
exports.deleteAccount = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
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
        }
        catch (error) {
            // A subscription Stripe no longer knows about is fine; anything else must stop the
            // deletion so billing doesn't continue for an account that no longer exists.
            if (error?.code !== "resource_missing") {
                console.error("[deleteAccount] Could not cancel subscription:", error);
                throw new https_1.HttpsError("internal", "Could not cancel your subscription. Please try again.");
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
exports.trimChatMessages = (0, https_1.onCall)(async (request) => {
    const { chatId } = request.data || {};
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    if (!chatId) {
        throw new https_1.HttpsError("invalid-argument", "chatId missing.");
    }
    const db = admin.firestore();
    const chatRef = db.collection("chats").doc(chatId);
    const snap = await chatRef.get();
    if (!snap.exists)
        return { ok: true, trimmed: 0 };
    const messages = snap.get("messages") || [];
    if (messages.length <= 25)
        return { ok: true, trimmed: 0 };
    const trimmed = messages.slice(-25);
    await chatRef.update({ messages: trimmed });
    return { ok: true, trimmed: messages.length - 25 };
});
// Test function to add subscription for specific users (for development/testing)
exports.addTestSubscription = (0, https_1.onCall)(async (request) => {
    // Require authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
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
        throw new https_1.HttpsError("permission-denied", "This function is only available for test users.");
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
    }
    catch (error) {
        console.error('Error adding test subscription:', error);
        throw new https_1.HttpsError("internal", `Failed to add subscription: ${error.message}`);
    }
});
//# sourceMappingURL=index.js.map