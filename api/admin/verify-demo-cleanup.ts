import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0309015147";
const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d";

const DEMO_USER_IDS = ["u-1", "u-2", "u-3", "u-4", "u-5"];
const DEMO_NAMES = [
  "คุณธนกฤต รจ.",
  "คุณสมชาย แข็งแรง",
  "คุณวิภาวี วิ่งไว",
  "คุณเกียรติศักดิ์ ฟิตเปรี๊ยะ",
  "คุณสุพัตรา รักสุขภาพ",
];

function getAdminDb() {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
  }
  const serviceAccount = JSON.parse(serviceAccountRaw);
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: FIREBASE_PROJECT_ID });
  return getFirestore(app, FIRESTORE_DB_ID);
}

// TEMPORARY, READ-ONLY: checks whether demo/seed data (5 fake users u-1..u-5
// and their workouts) still exists in Firestore, so cleanup done manually in
// the Firebase Console can be verified. Makes no writes. Remove once done.
export default async function handler(req: any, res: any) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret || req.query.secret !== channelSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = getAdminDb();

    const usersSnap = await db.collection("users").get();
    const remainingDemoUsers = usersSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u: any) => DEMO_USER_IDS.includes(u.id) || DEMO_NAMES.includes(u.name));

    const workoutsSnap = await db.collection("workouts").get();
    const remainingDemoWorkouts = workoutsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((w: any) => DEMO_USER_IDS.includes(w.userId) || DEMO_NAMES.includes(w.userName));

    res.status(200).json({
      totalUsers: usersSnap.size,
      totalWorkouts: workoutsSnap.size,
      remainingDemoUsers: remainingDemoUsers.map((u: any) => ({ id: u.id, name: u.name })),
      remainingDemoWorkoutsCount: remainingDemoWorkouts.length,
      remainingDemoWorkoutIds: remainingDemoWorkouts.map((w: any) => w.id),
      clean: remainingDemoUsers.length === 0 && remainingDemoWorkouts.length === 0,
    });
  } catch (error: any) {
    console.error("GET /api/admin/verify-demo-cleanup error:", error);
    res.status(500).json({ error: error.message || "เกิดข้อผิดพลาด" });
  }
}
