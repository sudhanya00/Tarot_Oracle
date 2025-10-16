import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import StripePkg from "stripe";
import corsLib from "cors";

const cors = corsLib({ origin: true });
admin.initializeApp();

// Read keys from Firebase env config:
//   firebase functions:config:set stripe.secret="sk_live_or_test_..." stripe.publishable="pk_..."
const STRIPE_SECRET = functions.config().stripe?.secret as string | undefined;
if (!STRIPE_SECRET) {
  console.warn("[WARN] Stripe secret not set. Use: firebase functions:config:set stripe.secret=\"sk_...\"");
}
const stripe = new StripePkg(STRIPE_SECRET || "", { apiVersion: "2024-06-20" });

// Utility: required field guard
function requireFields(obj: any, fields: string[]) {
  for (const f of fields) {
    if (!obj || obj[f] == null || obj[f] === "") {
      throw new functions.https.HttpsError("invalid-argument", `Missing field: ${f}`);
    }
  }
}

// POST https callable (REST style) to create a Stripe Checkout Session for subscription
export const createCheckoutSession = functions.region("us-central1").https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }
      if (!STRIPE_SECRET) {
        res.status(500).json({ error: "Stripe secret not configured on server." });
        return;
      }

      // Expected payload
      // { priceId: "price_xxx", customerEmail?: string, successUrl: "...", cancelUrl: "..." }
      const { priceId, customerEmail, successUrl, cancelUrl } = req.body || {};
      requireFields(req.body, ["priceId", "successUrl", "cancelUrl"]);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        automatic_tax: { enabled: true },
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      });

      res.status(200).json({ id: session.id, url: session.url });
    } catch (err: any) {
      console.error("createCheckoutSession error:", err);
      if (err instanceof functions.https.HttpsError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Internal error" });
    }
  });
});

// Optional: Webhook to handle subscription lifecycle events
// Set endpoint secret with: firebase functions:config:set stripe.webhook_secret="whsec_..."
const WEBHOOK_SECRET = functions.config().stripe?.webhook_secret as string | undefined;

export const stripeWebhook = functions.region("us-central1").https.onRequest((req, res) => {
  // Stripe sends raw body; disable automatic body parsing in Firebase console if needed.
  // But on Functions v2 HTTPS, raw body is preserved.
  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig || !WEBHOOK_SECRET) {
    res.status(400).send("Missing signature or endpoint secret");
    return;
  }

  let event: StripePkg.Event;
  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      console.log("[stripe] checkout.session.completed", (event.data.object as any).id);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      console.log("[stripe] subscription event", event.type);
      break;
    default:
      console.log(`[stripe] unhandled event: ${event.type}`);
  }
  res.json({ received: true });
});

// (Optional) Callable to prune chat messages server-side to <=25 for cost control
export const trimChatMessages = functions.region("us-central1").https.onCall(async (data, context) => {
  const { chatId } = data || {};
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  }
  if (!chatId) {
    throw new functions.https.HttpsError("invalid-argument", "chatId missing.");
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
