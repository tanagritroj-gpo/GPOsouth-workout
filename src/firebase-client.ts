import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
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

// Firestore rules require request.auth != null, so every Firestore call in this
// file must wait for this to resolve first. Anonymous sign-in doesn't verify who
// the employee is (the PIN screen still does that) — it just blocks raw,
// no-SDK-handshake reads/writes against the database from outside this app.
let authReadyPromise: Promise<void> | null = null;
function ensureAuthReady(): Promise<void> {
  if (!authReadyPromise) {
    authReadyPromise = signInAnonymously(auth)
      .then(() => undefined)
      .catch((err) => {
        console.error("Anonymous sign-in failed:", err);
        authReadyPromise = null; // allow retry on next call
        throw err;
      });
  }
  return authReadyPromise;
}

// 1. Get all users
export async function dbGetUsers(): Promise<User[]> {
  try {
    await ensureAuthReady();
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    const users: User[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as User;
      users.push({
        ...data,
        id: doc.id || data.id,
      });
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
    await ensureAuthReady();
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
    await ensureAuthReady();
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
    await ensureAuthReady();
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

export interface WorkoutsPage {
  workouts: Workout[];
  hasMore: boolean;
  cursor: QueryDocumentSnapshot<DocumentData> | null;
}

// 3b. Get one page of workouts, most recent first. For views that browse
// recent activity (Feed, History) rather than needing every record — unlike
// dbGetWorkouts/dbGetSummary, which power Dashboard/Leaderboard/Report and
// must sum every record to produce correct totals, so they stay unpaginated.
export async function dbGetWorkoutsPage(
  pageSize: number,
  cursor?: QueryDocumentSnapshot<DocumentData> | null
): Promise<WorkoutsPage> {
  try {
    await ensureAuthReady();
    const workoutsCol = collection(db, "workouts");
    // Fetch one extra doc to know whether there's a next page without a separate count query.
    const q = cursor
      ? query(workoutsCol, orderBy("createdAt", "desc"), startAfter(cursor), limit(pageSize + 1))
      : query(workoutsCol, orderBy("createdAt", "desc"), limit(pageSize + 1));
    const snapshot = await getDocs(q);
    const docsSlice = snapshot.docs.slice(0, pageSize);
    return {
      workouts: docsSlice.map((d) => d.data() as Workout),
      hasMore: snapshot.docs.length > pageSize,
      cursor: docsSlice[docsSlice.length - 1] || null,
    };
  } catch (err) {
    console.error("Error getting paginated workouts from Firestore:", err);
    return { workouts: [], hasMore: false, cursor: null };
  }
}

// 4. Add workout
export async function dbAddWorkout(workout: Workout): Promise<void> {
  try {
    await ensureAuthReady();
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
    await ensureAuthReady();
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

// 7. Comments & Reactions in Firestore
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
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  ensureAuthReady()
    .then(() => {
      if (cancelled) return;
      const commentsCol = collection(db, "comments");
      unsubscribe = onSnapshot(commentsCol, (snapshot) => {
        const comments: FeedCommentDoc[] = [];
        snapshot.forEach((docSnap) => {
          comments.push(docSnap.data() as FeedCommentDoc);
        });
        callback(comments);
      }, (error) => {
        console.error("Error in comments real-time listener:", error);
      });
    })
    .catch((err) => console.error("Error setting up comments listener:", err));

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

// Add comment to Firestore
export async function dbAddComment(comment: FeedCommentDoc): Promise<void> {
  try {
    await ensureAuthReady();
    const commentRef = doc(db, "comments", comment.id);
    await setDoc(commentRef, comment);
  } catch (err) {
    console.error("Error adding comment to Firestore:", err);
    throw err;
  }
}

// Real-time listener for Reactions
export function dbSubscribeReactions(callback: (reactions: FeedReactionDoc[]) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  ensureAuthReady()
    .then(() => {
      if (cancelled) return;
      const reactionsCol = collection(db, "reactions");
      unsubscribe = onSnapshot(reactionsCol, (snapshot) => {
        const reactions: FeedReactionDoc[] = [];
        snapshot.forEach((docSnap) => {
          reactions.push(docSnap.data() as FeedReactionDoc);
        });
        callback(reactions);
      }, (error) => {
        console.error("Error in reactions real-time listener:", error);
      });
    })
    .catch((err) => console.error("Error setting up reactions listener:", err));

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

// Toggle or save reaction to Firestore
export async function dbSaveReaction(reaction: FeedReactionDoc): Promise<void> {
  try {
    await ensureAuthReady();
    const reactionRef = doc(db, "reactions", reaction.id);
    await setDoc(reactionRef, reaction, { merge: true });
  } catch (err) {
    console.error("Error saving reaction to Firestore:", err);
    throw err;
  }
}

