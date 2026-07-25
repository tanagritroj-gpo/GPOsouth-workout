import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { User, Workout } from "./src/types";

// Load config safely from firebase-applet-config.json or environment variables (works on Vercel Serverless)
let config: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (err) {
  console.warn("Notice: Could not load firebase-applet-config.json via fs, using fallback configuration.");
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || config.apiKey || "AIzaSyCwW0ikefuXgi-oE14_W2h0YciH1BHoAk4",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || config.authDomain || "gen-lang-client-0309015147.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || config.projectId || "gen-lang-client-0309015147",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || config.storageBucket || "gen-lang-client-0309015147.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || "263693407727",
  appId: process.env.FIREBASE_APP_ID || config.appId || "1:263693407727:web:577f6248c0c8195c56921a",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || config.measurementId || "",
};

const app = initializeApp(firebaseConfig);
const firestoreDbId = config.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID || "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d";
const db = getFirestore(app, firestoreDbId);

// Helper to parse Firestore REST API response fields safely (ideal for Vercel Serverless)
function parseFirestoreValue(valObj: any): any {
  if (!valObj) return undefined;
  if (valObj.stringValue !== undefined) return valObj.stringValue;
  if (valObj.integerValue !== undefined) return Number(valObj.integerValue);
  if (valObj.doubleValue !== undefined) return Number(valObj.doubleValue);
  if (valObj.booleanValue !== undefined) return Boolean(valObj.booleanValue);
  if (valObj.mapValue !== undefined) {
    const fields = valObj.mapValue.fields || {};
    const res: any = {};
    for (const k of Object.keys(fields)) res[k] = parseFirestoreValue(fields[k]);
    return res;
  }
  if (valObj.arrayValue !== undefined) {
    const values = valObj.arrayValue.values || [];
    return values.map((v: any) => parseFirestoreValue(v));
  }
  return Object.values(valObj)[0];
}

function parseFirestoreDoc(docObj: any): any {
  if (!docObj || !docObj.fields) return null;
  const fields = docObj.fields;
  const result: any = {};
  for (const k of Object.keys(fields)) {
    result[k] = parseFirestoreValue(fields[k]);
  }
  return result;
}

async function fetchCollectionRest(collectionName: string): Promise<any[] | null> {
  const candidateDbIds = Array.from(new Set([
    process.env.FIRESTORE_DATABASE_ID,
    config.firestoreDatabaseId,
    "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d",
    "(default)"
  ].filter(Boolean)));

  for (const dbId of candidateDbIds) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/${collectionName}?key=${firebaseConfig.apiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        return data.documents.map(parseFirestoreDoc).filter(Boolean);
      } else if (res.ok) {
        return [];
      }
    } catch (err) {
      // try next
    }
  }
  return null;
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

// Helper to wrap promises with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// 1. Get all users
export async function getUsers(): Promise<User[]> {
  const restUsers = await fetchCollectionRest("users");
  if (restUsers && Array.isArray(restUsers)) {
    return restUsers as User[];
  }

  try {
    const usersCol = collection(db, "users");
    const snapshot = await withTimeout(getDocs(usersCol), 3000);
    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    return users;
  } catch (err) {
    console.error("Error getting users from Firestore:", err);
    return [];
  }
}

// 2. Add user
export async function addUser(user: User): Promise<void> {
  try {
    const userRef = doc(db, "users", user.id);
    await withTimeout(setDoc(userRef, user), 4000);
  } catch (err) {
    console.error("Error adding user to Firestore:", err);
    throw err;
  }
}

// 3. Get all workouts
export async function getWorkouts(): Promise<Workout[]> {
  const restWorkouts = await fetchCollectionRest("workouts");
  if (restWorkouts && Array.isArray(restWorkouts)) {
    const workouts = restWorkouts as Workout[];
    return workouts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  try {
    const workoutsCol = collection(db, "workouts");
    const snapshot = await withTimeout(getDocs(workoutsCol), 3000);
    const workouts: Workout[] = [];
    snapshot.forEach((doc) => {
      workouts.push(doc.data() as Workout);
    });
    return workouts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    console.error("Error getting workouts from Firestore:", err);
    return [];
  }
}

// 4. Add workout
export async function addWorkout(workout: Workout): Promise<void> {
  try {
    const workoutRef = doc(db, "workouts", workout.id);
    await setDoc(workoutRef, workout);
  } catch (err) {
    console.error("Error adding workout to Firestore:", err);
    throw err;
  }
}

// 5. Delete workout
export async function deleteWorkout(id: string): Promise<boolean> {
  try {
    const workoutRef = doc(db, "workouts", id);
    const docSnap = await getDoc(workoutRef);
    if (!docSnap.exists()) {
      return false;
    }
    await deleteDoc(workoutRef);
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
