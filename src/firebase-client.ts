import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import config from "../firebase-applet-config.json";
import { User, Workout, WorkoutStats, LeaderboardEntry } from "./types";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (config as any).firestoreDatabaseId || "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d");
export const auth = getAuth(app);

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

  for (let i = 0; i < 28; i++) {
    const recordDate = new Date(today);
    recordDate.setDate(today.getDate() - i);
    const dateStr = recordDate.toISOString().split("T")[0]; // YYYY-MM-DD

    users.forEach((user) => {
      const rand = (parseInt(user.id.replace("u-", "")) + i) % 7;
      if (rand < 4) { // Active on this day
        const actIndex = (parseInt(user.id.replace("u-", "")) * i) % activities.length;
        const act = activities[actIndex];
        
        const variance = 0.8 + ((i % 5) * 0.1); // 0.8 to 1.2
        const steps = Math.round(activitySteps[act] * variance);
        const calories = Math.round(activityCalories[act] * variance);
        const durationMinutes = Math.round(30 * variance);
        
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
          durationMinutes,
          imageUrl: "",
          createdAt: recordDate.toISOString(),
        });
      }
    });
  }

  return { users, workouts };
}

// 1. Get all users
export async function dbGetUsers(): Promise<User[]> {
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

// 2. Add user (Register)
export async function dbAddUser(user: User): Promise<void> {
  try {
    const userRef = doc(db, "users", user.id);
    await setDoc(userRef, user);
  } catch (err) {
    console.error("Error adding user to Firestore:", err);
    throw err;
  }
}

// 2b. Update user profile photo
export async function dbUpdateUserPhoto(userId: string, photoUrl: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { photoUrl }, { merge: true });
  } catch (err) {
    console.error("Error updating user photo in Firestore:", err);
    throw err;
  }
}

// 3. Get all workouts
export async function dbGetWorkouts(): Promise<Workout[]> {
  try {
    const workoutsCol = collection(db, "workouts");
    const snapshot = await getDocs(workoutsCol);
    const workouts: Workout[] = [];
    snapshot.forEach((doc) => {
      workouts.push(doc.data() as Workout);
    });
    return workouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error getting workouts from Firestore:", err);
    return [];
  }
}

// 4. Add workout
export async function dbAddWorkout(workout: Workout): Promise<void> {
  try {
    const workoutRef = doc(db, "workouts", workout.id);
    await setDoc(workoutRef, workout);
  } catch (err) {
    console.error("Error adding workout to Firestore:", err);
    throw err;
  }
}

// 5. Delete workout
export async function dbDeleteWorkout(id: string): Promise<boolean> {
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

// 6. Get Summary
export async function dbGetSummary(): Promise<{ stats: WorkoutStats; leaderboard: LeaderboardEntry[] }> {
  try {
    const [workouts, users] = await Promise.all([
      dbGetWorkouts(),
      dbGetUsers()
    ]);

    const leaderboardMap: { [key: string]: { userName: string; userPhotoUrl?: string; totalSteps: number; totalCalories: number; totalDurationMinutes: number; totalWorkouts: number } } = {};
    
    users.forEach((u) => {
      leaderboardMap[u.id] = {
        userName: u.name,
        userPhotoUrl: u.photoUrl,
        totalSteps: 0,
        totalCalories: 0,
        totalDurationMinutes: 0,
        totalWorkouts: 0,
      };
    });

    let totalSteps = 0;
    let totalCalories = 0;
    let totalDurationMinutes = 0;
    let totalWorkouts = workouts.length;

    const byActivity: { [key: string]: { steps: number; calories: number; durationMinutes: number; count: number } } = {};

    workouts.forEach((w) => {
      const dur = w.durationMinutes || 0;
      totalSteps += w.steps;
      totalCalories += w.calories;
      totalDurationMinutes += dur;

      if (leaderboardMap[w.userId]) {
        leaderboardMap[w.userId].totalSteps += w.steps;
        leaderboardMap[w.userId].totalCalories += w.calories;
        leaderboardMap[w.userId].totalDurationMinutes += dur;
        leaderboardMap[w.userId].totalWorkouts += 1;
      }

      if (!byActivity[w.activityType]) {
        byActivity[w.activityType] = { steps: 0, calories: 0, durationMinutes: 0, count: 0 };
      }
      byActivity[w.activityType].steps += w.steps;
      byActivity[w.activityType].calories += w.calories;
      byActivity[w.activityType].durationMinutes += dur;
      byActivity[w.activityType].count += 1;
    });

    const leaderboard: LeaderboardEntry[] = Object.keys(leaderboardMap).map((userId) => ({
      userId,
      userName: leaderboardMap[userId].userName,
      userPhotoUrl: leaderboardMap[userId].userPhotoUrl,
      totalSteps: leaderboardMap[userId].totalSteps,
      totalCalories: leaderboardMap[userId].totalCalories,
      totalDurationMinutes: leaderboardMap[userId].totalDurationMinutes,
      totalWorkouts: leaderboardMap[userId].totalWorkouts,
    })).sort((a, b) => b.totalSteps - a.totalSteps);

    leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    return {
      stats: {
        totalSteps,
        totalCalories,
        totalDurationMinutes,
        totalWorkouts,
        byActivity,
      },
      leaderboard,
    };
  } catch (err) {
    console.error("Error getting summary:", err);
    return {
      stats: { totalSteps: 0, totalCalories: 0, totalDurationMinutes: 0, totalWorkouts: 0, byActivity: {} },
      leaderboard: [],
    };
  }
}

// 7. Seed initial data if Firestore database is empty
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    if (snapshot.empty) {
      console.log("Firestore database is empty. Seeding initial GPO South Health Tracker data from client-side...");
      const initialData = getInitialMockData();
      
      for (const user of initialData.users) {
        await dbAddUser(user);
      }
      
      for (const workout of initialData.workouts) {
        await dbAddWorkout(workout);
      }
      console.log("Seeding complete on client side!");
    }
  } catch (err) {
    console.error("Error seeding initial data to Firestore from client-side:", err);
  }
}

// 8. Comments & Reactions in Firestore
export interface FeedCommentDoc {
  id: string;
  workoutId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface FeedReactionDoc {
  id: string; // `${workoutId}_${userId}_${type}`
  workoutId: string;
  userId: string;
  type: string; // 'hearts' | 'highFives' | 'fires'
  active: boolean;
  updatedAt: string;
}

// Real-time listener for Comments
export function dbSubscribeComments(callback: (comments: FeedCommentDoc[]) => void): () => void {
  try {
    const commentsCol = collection(db, "comments");
    return onSnapshot(commentsCol, (snapshot) => {
      const comments: FeedCommentDoc[] = [];
      snapshot.forEach((docSnap) => {
        comments.push(docSnap.data() as FeedCommentDoc);
      });
      callback(comments);
    }, (error) => {
      console.error("Error in comments real-time listener:", error);
    });
  } catch (err) {
    console.error("Error setting up comments listener:", err);
    return () => {};
  }
}

// Add comment to Firestore
export async function dbAddComment(comment: FeedCommentDoc): Promise<void> {
  try {
    const commentRef = doc(db, "comments", comment.id);
    await setDoc(commentRef, comment);
  } catch (err) {
    console.error("Error adding comment to Firestore:", err);
    throw err;
  }
}

// Real-time listener for Reactions
export function dbSubscribeReactions(callback: (reactions: FeedReactionDoc[]) => void): () => void {
  try {
    const reactionsCol = collection(db, "reactions");
    return onSnapshot(reactionsCol, (snapshot) => {
      const reactions: FeedReactionDoc[] = [];
      snapshot.forEach((docSnap) => {
        reactions.push(docSnap.data() as FeedReactionDoc);
      });
      callback(reactions);
    }, (error) => {
      console.error("Error in reactions real-time listener:", error);
    });
  } catch (err) {
    console.error("Error setting up reactions listener:", err);
    return () => {};
  }
}

// Toggle or save reaction to Firestore
export async function dbSaveReaction(reaction: FeedReactionDoc): Promise<void> {
  try {
    const reactionRef = doc(db, "reactions", reaction.id);
    await setDoc(reactionRef, reaction, { merge: true });
  } catch (err) {
    console.error("Error saving reaction to Firestore:", err);
    throw err;
  }
}

