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
const firestoreDbId = process.env.FIRESTORE_DATABASE_ID || config.firestoreDatabaseId || "(default)";
const db = firestoreDbId && firestoreDbId !== "(default)" ? getFirestore(app, firestoreDbId) : getFirestore(app);

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
  if (!result.id && docObj.name) {
    result.id = docObj.name.split("/").pop();
  }
  return result;
}

async function fetchCollectionRest(collectionName: string): Promise<any[] | null> {
  const dbIds = ["(default)", firestoreDbId, "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d"];
  for (const dbId of dbIds) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${encodeURIComponent(dbId)}/documents/${collectionName}?key=${firebaseConfig.apiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
        return data.documents.map(parseFirestoreDoc).filter(Boolean);
      }
    } catch (err) {
      // continue to next database ID
    }
  }
  return null;
}

// Helper to get initial mock data to seed GPO South Health Tracker if empty
export function getInitialMockData(): { users: User[]; workouts: Workout[] } {
  const users: User[] = [
    { id: "u-1", name: "คุณธนกฤต รจ.", department: "GPO South", pin: "1234", createdAt: new Date().toISOString() },
    { id: "u-2", name: "คุณสมชาย แข็งแรง", department: "GPO South", pin: "1111", createdAt: new Date().toISOString() },
    { id: "u-3", name: "คุณวิภาวี วิ่งไว", department: "GPO South", pin: "2222", createdAt: new Date().toISOString() },
    { id: "u-4", name: "คุณเกียรติศักดิ์ ฟิตเปรี๊ยะ", department: "GPO South", pin: "3333", createdAt: new Date().toISOString() },
    { id: "u-5", name: "คุณสุพัตรา รักสุขภาพ", department: "GPO South", pin: "4444", createdAt: new Date().toISOString() },
  ];

  const workouts: Workout[] = [];
  const activities = ["วิ่ง", "เดินเร็ว", "ว่ายน้ำ", "เต้นแอโรบิค", "เดิน Trail", "ออกกำลังกายหลายรูปแบบ"];
  const activitySteps: { [key: string]: number } = {
    "วิ่ง": 8000,
    "เดินเร็ว": 6000,
    "ว่ายน้ำ": 1000,
    "เต้นแอโรบิค": 4000,
    "เดิน Trail": 12000,
    "ออกกำลังกายหลายรูปแบบ": 5000,
  };
  const activityCalories: { [key: string]: number } = {
    "วิ่ง": 500,
    "เดินเร็ว": 300,
    "ว่ายน้ำ": 450,
    "เต้นแอโรบิค": 350,
    "เดิน Trail": 700,
    "ออกกำลังกายหลายรูปแบบ": 400,
  };

  const today = new Date();
  let workoutIdCounter = 1;

  // Generate 4 weeks of back-dated records for mock users
  for (let i = 0; i < 28; i++) {
    const recordDate = new Date(today);
    recordDate.setDate(today.getDate() - i);
    const dateStr = recordDate.toISOString().split("T")[0]; // YYYY-MM-DD

    users.forEach((user) => {
      // Deterministic random activity based on user ID and day
      const rand = (parseInt(user.id.replace("u-", "")) + i) % 7;
      if (rand < 4) { // Active on this day
        const actIndex = (parseInt(user.id.replace("u-", "")) * i) % activities.length;
        const act = activities[actIndex];
        
        // Add variations to steps and calories
        const variance = 0.8 + ((i % 5) * 0.1); // 0.8 to 1.2
        const steps = Math.round(activitySteps[act] * variance);
        const calories = Math.round(activityCalories[act] * variance);
        
        // Determine reporting period and format
        let submissionFormat: "daily" | "weekly" | "monthly" = "daily";
        let period = dateStr;
        if (i % 7 === 0 && i > 0) {
          submissionFormat = "weekly";
          const startWeek = new Date(recordDate);
          startWeek.setDate(recordDate.getDate() - 6);
          period = `${startWeek.getDate()} - ${recordDate.getDate()} มี.ค. 2569`;
        } else if (i % 25 === 0 && i > 0) {
          submissionFormat = "monthly";
          period = "เดือนมิถุนายน 2569";
        }

        workouts.push({
          id: `w-${workoutIdCounter++}`,
          userId: user.id,
          userName: user.name,
          date: dateStr,
          submissionFormat,
          period,
          activityType: act,
          steps,
          calories,
          imageUrl: "",
          createdAt: recordDate.toISOString(),
        });
      }
    });
  }

  return { users, workouts };
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
  if (restUsers && Array.isArray(restUsers) && restUsers.length > 0) {
    return restUsers as User[];
  }

  try {
    const usersCol = collection(db, "users");
    const snapshot = await withTimeout(getDocs(usersCol), 2500);
    const users: User[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    return users.length > 0 ? users : getInitialMockData().users;
  } catch (err) {
    console.error("Error getting users from Firestore (falling back):", err);
    return getInitialMockData().users;
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
  if (restWorkouts && Array.isArray(restWorkouts) && restWorkouts.length > 0) {
    const workouts = restWorkouts as Workout[];
    return workouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const workoutsCol = collection(db, "workouts");
    const snapshot = await withTimeout(getDocs(workoutsCol), 2500);
    const workouts: Workout[] = [];
    snapshot.forEach((doc) => {
      workouts.push(doc.data() as Workout);
    });
    return workouts.length > 0
      ? workouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : getInitialMockData().workouts;
  } catch (err) {
    console.error("Error getting workouts from Firestore (falling back):", err);
    return getInitialMockData().workouts;
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

// 6. Seed initial data if Firestore database is empty
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    if (snapshot.empty) {
      console.log("Firestore database is empty. Seeding initial GPO South Health Tracker data...");
      const initialData = getInitialMockData();
      
      // Write users
      for (const user of initialData.users) {
        await addUser(user);
      }
      
      // Write workouts (sequentially to avoid write rate limit on cold Firestore)
      for (const workout of initialData.workouts) {
        await addWorkout(workout);
      }
      console.log(`Seeding complete! Seeded ${initialData.users.length} users and ${initialData.workouts.length} workouts.`);
    } else {
      console.log("Firestore database already contains data. Skipping seed.");
    }
  } catch (err) {
    console.error("Error seeding initial data to Firestore:", err);
  }
}
