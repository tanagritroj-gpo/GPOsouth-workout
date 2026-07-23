import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { User, Workout } from "./src/types";

// Load config from firebase-applet-config.json
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, config.firestoreDatabaseId || "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d");

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

// 1. Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
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
    await setDoc(userRef, user);
  } catch (err) {
    console.error("Error adding user to Firestore:", err);
    throw err;
  }
}

// 3. Get all workouts
export async function getWorkouts(): Promise<Workout[]> {
  try {
    const workoutsCol = collection(db, "workouts");
    const snapshot = await getDocs(workoutsCol);
    const workouts: Workout[] = [];
    snapshot.forEach((doc) => {
      workouts.push(doc.data() as Workout);
    });
    // Sort by createdAt descending
    return workouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
