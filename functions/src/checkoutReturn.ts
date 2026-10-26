// functions/src/checkoutReturn.ts
// Where Stripe Checkout sends the browser afterwards. The app unlocks from the webhook,
// so this page only has to tell people they can go back.
import {onRequest} from "firebase-functions/v2/https";

const COPY = {
  success: {
    title: "Payment complete",
    body: "Your readings are unlocked. Close this page to return to Tarot Oracle.",
  },
  cancelled: {
    title: "Checkout cancelled",
    body: "No payment was taken. Close this page to return to Tarot Oracle.",
  },
};

export const checkoutReturn = onRequest((req, res) => {
  const copy = req.query.status === "success" ? COPY.success : COPY.cancelled;
  res.set("Cache-Control", "no-store");
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${copy.title} · Tarot Oracle</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background: radial-gradient(circle at 50% 0%, #161d48, #070a1a 60%, #04050c);
    color: #e8e6f2; font-family: Georgia, "Times New Roman", serif; }
  main { max-width: 420px; text-align: center; }
  h1 { color: #f1e9d8; font-weight: 400; font-size: 32px; margin: 0 0 12px; }
  p { color: #9a9db8; font-size: 18px; line-height: 1.5; margin: 0 0 28px; }
  a { display: inline-block; padding: 14px 28px; border-radius: 999px; text-decoration: none;
    background: linear-gradient(135deg, #f6dfa8, #e3c07f 50%, #a47a37); color: #04050c; font-size: 17px; }
</style>
</head>
<body>
<main>
  <h1>${copy.title}</h1>
  <p>${copy.body}</p>
  <a href="tarotoracle://">Back to Tarot Oracle</a>
</main>
</body>
</html>`);
});
