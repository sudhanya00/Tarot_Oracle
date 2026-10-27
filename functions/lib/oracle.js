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
Object.defineProperty(exports, "__esModule", { value: true });
exports.oracleReply = void 0;
// functions/src/oracle.ts
// Streams tarot readings from OpenAI. Runs server-side so the API key stays secret and
// access (an active plan, or the one free reading) is enforced where users can't bypass it.
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const persona_1 = require("./persona");
const openaiApiKey = (0, params_1.defineSecret)("OPENAI_API_KEY");
// GPT-5.6 Luna via the Responses API: low reasoning effort keeps replies fast.
const MODEL = "gpt-5.6-luna";
const REASONING_EFFORT = "low";
// Reasoning tokens count against this budget, so leave headroom above the visible reply.
const MAX_OUTPUT_TOKENS = 1600;
// Matches the 25-message cap the app stores per chat.
const MAX_MESSAGES = 25;
const MAX_MESSAGE_CHARS = 4000;
function cleanMessages(raw) {
    if (!Array.isArray(raw) || raw.length === 0)
        return null;
    const messages = raw.slice(-MAX_MESSAGES).map((m) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: typeof m?.content === "string" ? m.content.slice(0, MAX_MESSAGE_CHARS) : "",
    }));
    if (messages[messages.length - 1].role !== "user" || !messages[messages.length - 1].content.trim()) {
        return null;
    }
    return messages;
}
// Same rule the app uses: active, and not past its expiry if it has one.
async function hasActivePlan(uid) {
    const data = (await admin.firestore().collection("subscriptions").doc(uid).get()).data();
    return !!(data?.isActive && (!data.expiresAt || data.expiresAt > Date.now()));
}
// Claims the single free reading. usage/{uid} is server-only (no client rules), so it can't be reset
// from the app; users/{uid}.hasUsedFreeTrial is honoured for people who used it before this existed.
async function claimFreeReading(uid) {
    const db = admin.firestore();
    const usageRef = db.collection("usage").doc(uid);
    const userRef = db.collection("users").doc(uid);
    return db.runTransaction(async (tx) => {
        const [usage, user] = await Promise.all([tx.get(usageRef), tx.get(userRef)]);
        if (usage.get("freeReadingClaimedAt") || user.get("hasUsedFreeTrial") === true)
            return false;
        tx.set(usageRef, { freeReadingClaimedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return true;
    });
}
// Gives the free reading back when OpenAI failed before any text reached the user.
async function releaseFreeReading(uid) {
    await admin.firestore().collection("usage").doc(uid).set({ freeReadingClaimedAt: admin.firestore.FieldValue.delete() }, { merge: true });
}
// Re-emits only the stream events the app reads, so nothing else from the upstream
// response (such as the instructions) is sent to the device.
function relay(block) {
    const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
    if (!data || data === "[DONE]")
        return {};
    let event;
    try {
        event = JSON.parse(data);
    }
    catch {
        return {};
    }
    let payload = null;
    switch (event?.type) {
        case "response.output_text.delta":
            payload = { type: event.type, delta: event.delta ?? "" };
            break;
        case "response.completed":
        case "response.incomplete":
            payload = { type: event.type };
            break;
        case "response.failed":
            payload = { type: event.type, response: { error: { message: event.response?.error?.message || "failed" } } };
            break;
        case "error":
            payload = { type: event.type, message: event.message || event.error?.message || "stream error" };
            break;
    }
    if (!payload)
        return {};
    const error = event.type === "response.failed" || event.type === "error" ?
        String(event.message || event.error?.message || event.response?.error?.message || event.type) :
        undefined;
    return { out: `data: ${JSON.stringify(payload)}\n\n`, text: event.type === "response.output_text.delta", error };
}
exports.oracleReply = (0, https_1.onRequest)({ secrets: [openaiApiKey], cors: true, timeoutSeconds: 120 }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "method_not_allowed" });
        return;
    }
    const header = req.get("Authorization") || "";
    let uid;
    try {
        uid = (await admin.auth().verifyIdToken(header.replace(/^Bearer\s+/i, ""))).uid;
    }
    catch {
        res.status(401).json({ error: "unauthenticated" });
        return;
    }
    const messages = cleanMessages(req.body?.messages);
    if (!messages) {
        res.status(400).json({ error: "invalid_messages" });
        return;
    }
    let usingFreeReading = false;
    if (!(await hasActivePlan(uid))) {
        if (!(await claimFreeReading(uid))) {
            res.status(402).json({ error: "payment_required" });
            return;
        }
        usingFreeReading = true;
    }
    // Stop paying for tokens if the user leaves mid-reading.
    const controller = new AbortController();
    res.on("close", () => controller.abort());
    let sentText = false;
    try {
        const upstream = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openaiApiKey.value()}`,
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
            },
            body: JSON.stringify({
                model: MODEL,
                instructions: persona_1.SYSTEM_PROMPT,
                input: messages,
                reasoning: { effort: REASONING_EFFORT },
                max_output_tokens: MAX_OUTPUT_TOKENS,
                stream: true,
                store: false,
            }),
            signal: controller.signal,
        });
        if (!upstream.ok || !upstream.body) {
            console.error("[oracle] OpenAI error:", upstream.status, await upstream.text());
            res.status(502).json({ error: "upstream_error" });
            return;
        }
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.flushHeaders();
        const decoder = new TextDecoder();
        let buffer = "";
        for await (const chunk of upstream.body) {
            buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
                const { out, text, error } = relay(buffer.slice(0, boundary));
                if (error)
                    console.error("[oracle] OpenAI stream error:", error);
                buffer = buffer.slice(boundary + 2);
                boundary = buffer.indexOf("\n\n");
                if (out)
                    res.write(out);
                if (text)
                    sentText = true;
            }
        }
    }
    catch (error) {
        if (!controller.signal.aborted)
            console.error("[oracle] Stream failed:", error);
        if (!res.headersSent)
            res.status(502).json({ error: "upstream_error" });
    }
    finally {
        if (usingFreeReading && !sentText)
            await releaseFreeReading(uid).catch(() => undefined);
        if (!res.writableEnded)
            res.end();
    }
});
//# sourceMappingURL=oracle.js.map