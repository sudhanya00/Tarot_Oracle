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
exports.addTestSubscription = exports.trimChatMessages = exports.stripeWebhook = exports.createStripeCheckoutSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const cors_1 = __importDefault(require("cors"));
const corsHandler = (0, cors_1.default)({ origin: true });
admin.initializeApp();
// Define parameters for runtime config
const stripeSecretKey = (0, params_1.defineString)("STRIPE_SECRET_KEY");
const stripePriceId = (0, params_1.defineString)("STRIPE_PRICE_ID");
// Initialize Stripe (will use runtime config)
const getStripe = () => {
    const secret = stripeSecretKey.value();
    if (!secret) {
        throw new Error("Stripe secret key not configured");
    }
    return new stripe_1.default(secret, { apiVersion: "2024-06-20" });
};
// Firebase Callable Function: Create Stripe Checkout Session
exports.createStripeCheckoutSession = (0, https_1.onCall)(async (request) => {
    // Require authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to start a purchase.");
    }
    const stripe = getStripe();
    const { userId, priceId } = request.data || {};
    // Use price ID from config or provided data
    const finalPriceId = priceId || stripePriceId.value() || "price_1Rrp7ZHjNbUwdLx2q2Pqofvn";
    try {
        // Get user email from auth
        const userEmail = request.auth.token.email;
        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [
                {
                    price: finalPriceId,
                    quantity: 1,
                },
            ],
            customer_email: userEmail,
            client_reference_id: userId || request.auth.uid,
            success_url: `https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://yourapp.com/cancel`,
            allow_promotion_codes: true,
            billing_address_collection: "auto",
            metadata: {
                userId: userId || request.auth.uid,
            },
        });
        console.log("Created Stripe Checkout session:", session.id, "for user:", request.auth.uid);
        return {
            sessionId: session.id,
            url: session.url,
        };
    }
    catch (error) {
        console.error("Error creating Stripe Checkout session:", error);
        throw new https_1.HttpsError("internal", `Failed to create checkout session: ${error.message}`);
    }
});
// Optional: Webhook to handle subscription lifecycle events
const stripeWebhookSecret = (0, params_1.defineString)("STRIPE_WEBHOOK_SECRET", { default: "" });
exports.stripeWebhook = (0, https_1.onRequest)(async (req, res) => {
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
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            console.log("[stripe] checkout.session.completed", session.id);
            // Get user ID from metadata or client_reference_id
            const userId = session.metadata?.userId || session.client_reference_id;
            if (userId && session.payment_status === "paid") {
                // Activate subscription in Firestore
                try {
                    await admin.firestore().collection("subscriptions").doc(userId).set({
                        isActive: true,
                        stripeCustomerId: session.customer,
                        stripeSubscriptionId: session.subscription,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    console.log("[stripe] Activated subscription for user:", userId);
                }
                catch (error) {
                    console.error("[stripe] Error activating subscription:", error);
                }
            }
            break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
            const subscription = event.data.object;
            console.log("[stripe] subscription event", event.type, subscription.id);
            // Update subscription status in Firestore
            // You'll need to link subscription to user via customer ID
            if (subscription.metadata?.userId) {
                try {
                    await admin.firestore().collection("subscriptions").doc(subscription.metadata.userId).set({
                        isActive: subscription.status === "active" || subscription.status === "trialing",
                        stripeSubscriptionId: subscription.id,
                        status: subscription.status,
                        currentPeriodEnd: subscription.current_period_end * 1000, // Convert to ms
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    console.log("[stripe] Updated subscription for user:", subscription.metadata.userId);
                }
                catch (error) {
                    console.error("[stripe] Error updating subscription:", error);
                }
            }
            break;
        }
        case "customer.subscription.deleted": {
            const subscription = event.data.object;
            console.log("[stripe] subscription deleted", subscription.id);
            if (subscription.metadata?.userId) {
                try {
                    await admin.firestore().collection("subscriptions").doc(subscription.metadata.userId).set({
                        isActive: false,
                        status: "canceled",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    console.log("[stripe] Deactivated subscription for user:", subscription.metadata.userId);
                }
                catch (error) {
                    console.error("[stripe] Error deactivating subscription:", error);
                }
            }
            break;
        }
        default:
            console.log(`[stripe] unhandled event: ${event.type}`);
    }
    res.json({ received: true });
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