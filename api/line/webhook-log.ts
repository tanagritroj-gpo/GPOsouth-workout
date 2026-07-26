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

// TEMPORARY: read back what api/line/webhook.ts captured. Protected by the
// channel secret as a shared key so it isn't a wide-open public endpoint.
export default async function handler(req: any, res: any) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret || req.query.secret !== channelSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const db = getAdminDb();
    const snapshot = await db.collection("_lineWebhookDebug").orderBy("receivedAt", "desc").limit(20).get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.status(200).json({ events });
  } catch (error: any) {
    console.error("GET /api/line/webhook-log error:", error);
    res.status(500).json({ error: error.message || "เกิดข้อผิดพลาด" });
  }
}
