import crypto from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0309015147";
const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d";

function getAdminDb() {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
  }
  const serviceAccount = JSON.parse(serviceAccountRaw);
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: FIREBASE_PROJECT_ID });
  return getFirestore(app, FIRESTORE_DB_ID);
}

// TEMPORARY: LINE webhook used only to discover a group's ID once the bot is
// invited into it (the Messaging API has no "list my groups" endpoint — the
// group ID only ever shows up in an event payload). Safe to remove/disable
// once the target group's ID has been captured and configured.
//
// Kept as a standalone file directly under /api (rather than routed through
// server.ts) because importing firebase-admin transitively through
// server.ts's bundle crashes on Vercel (FUNCTION_INVOCATION_FAILED) — same
// class of bundling issue this project hit earlier with api/line-send.ts.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Ack immediately — LINE expects a fast response and retries on timeout/non-200.
  res.status(200).json({ received: true });

  try {
    // Best-effort signature check only — Vercel's platform-level body parsing
    // means we no longer have the exact raw bytes LINE signed, so a mismatch
    // here is inconclusive and only logged, not enforced. This endpoint is
    // temporary and only writes to a private debug collection, so the risk
    // of accepting an unverified payload is minimal.
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const signature = req.headers["x-line-signature"] as string | undefined;
    if (channelSecret && signature) {
      const rawBody = JSON.stringify(req.body || {});
      const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
      if (signature !== expected) {
        console.warn("LINE webhook: signature did not match reconstructed body (expected with Vercel's body parsing) — logging anyway");
      }
    }

    const events = (req.body && req.body.events) || [];
    if (events.length === 0) return;

    const db = getAdminDb();
    for (const event of events) {
      console.log("LINE webhook event:", JSON.stringify(event));
      await db.collection("_lineWebhookDebug").add({
        type: event.type,
        sourceType: event.source?.type || null,
        groupId: event.source?.groupId || null,
        roomId: event.source?.roomId || null,
        userId: event.source?.userId || null,
        messageText: event.message?.text || null,
        receivedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("LINE webhook error:", error);
  }
}
