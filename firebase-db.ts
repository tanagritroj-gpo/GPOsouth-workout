import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { User, Workout } from "./src/types";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0309015147";
const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d";

export function getAdminDb() {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Add the Firebase service account JSON key to allow server-side Firestore access."
    );
  }
  const serviceAccount = JSON.parse(serviceAccountRaw);
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: FIREBASE_PROJECT_ID });
  return getFirestore(app, FIRESTORE_DB_ID);
}

// Helper to get initial mock data if needed for UI testing
export function getInitialMockData(): { users: User[]; workouts: Workout[] } {
  const users: User[] = [
    { id: "u-1", name: "คุณธนกฤต รจ.", department: "GPO South", pin: "1234", createdAt: new Date().toISOString() },
    { id: "u-2", name: "คุณสมชาย แข็งแรง", department: "GPO South", pin: "1111", createdAt: new Date().toISOString() },
    { id: "u-3", name: "คุณวิภาวี วิ่งไว", department: "GPO South", pin: "2222", createdAt: new Date().toISOString() },
    { id: "u-4", name: "คุณเกียรติศักดิ์ ฟิตเปรี๊ยะ", department: "GPO South", pin: "3333", createdAt: new Date().toISOString() },
    { id: "u-5", name: "คุณสุพัตรา รักสุขภาพ", department: "GPO South", pin: "4444", createdAt: new Date().toISOString() },
  ];
  return { users, workouts: [] };
}

// 1. Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map((doc) => ({ ...(doc.data() as User), id: doc.id }));
  } catch (err) {
    console.error("Error getting users from Firestore:", err);
    return [];
  }
}

// 2. Add user
export async function addUser(user: User): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection("users").doc(user.id).set(user);
  } catch (err) {
    console.error("Error adding user to Firestore:", err);
    throw err;
  }
}

// 3. Get all workouts
export async function getWorkouts(): Promise<Workout[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("workouts").get();
    const workouts = snapshot.docs.map((doc) => ({ ...(doc.data() as Workout), id: doc.id }));
    return workouts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    console.error("Error getting workouts from Firestore:", err);
    return [];
  }
}

// 4. Add workout
export async function addWorkout(workout: Workout): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection("workouts").doc(workout.id).set(workout);
  } catch (err) {
    console.error("Error adding workout to Firestore:", err);
    throw err;
  }
}

// 5. Delete workout
export async function deleteWorkout(id: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    const ref = db.collection("workouts").doc(id);
    const docSnap = await ref.get();
    if (!docSnap.exists) {
      return false;
    }
    await ref.delete();
    return true;
  } catch (err) {
    console.error("Error deleting workout from Firestore:", err);
    throw err;
  }
}

// 6. Seed initial data (Disabled: Do not auto-seed mock data into Firestore)
export async function seedInitialDataIfEmpty(): Promise<void> {
  return;
}
