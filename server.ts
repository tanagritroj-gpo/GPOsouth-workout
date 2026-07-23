import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { User, Workout, LeaderboardEntry } from "./src/types";
import {
  getUsers,
  addUser,
  getWorkouts,
  addWorkout,
  deleteWorkout,
  seedInitialDataIfEmpty
} from "./firebase-db";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// --- API ROUTES ---

// 1. Get all employees (names and departments only, PIN hashed/hidden)
app.get("/api/users", async (req, res) => {
  try {
    const users = await getUsers();
    const safeUsers = users.map(({ id, name, department }) => ({ id, name, department }));
    res.json(safeUsers);
  } catch (error) {
    console.error("GET /api/users error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน" });
  }
});

// 2. Register new employee
app.post("/api/auth/register", async (req, res) => {
  const { name, pin, department } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: "กรุณาระบุชื่อพนักงานและรหัสผ่าน (PIN)" });
  }

  try {
    const users = await getUsers();
    const exists = users.some((u) => u.name.trim() === name.trim());
    if (exists) {
      return res.status(400).json({ error: "ชื่อพนักงานนี้มีในระบบแล้ว" });
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      department: department || "GPO South",
      pin: pin.toString(),
      createdAt: new Date().toISOString(),
    };

    await addUser(newUser);

    res.json({ success: true, user: { id: newUser.id, name: newUser.name, department: newUser.department } });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลงทะเบียน" });
  }
});

// 3. Login
app.post("/api/auth/login", async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: "กรุณาระบุชื่อพนักงานและรหัสผ่าน (PIN)" });
  }

  try {
    const users = await getUsers();
    const user = users.find((u) => u.name.trim() === name.trim() && u.pin.toString() === pin.toString());
    if (!user) {
      return res.status(401).json({ error: "ชื่อพนักงานหรือรหัสผ่าน (PIN) ไม่ถูกต้อง" });
    }

    res.json({ success: true, user: { id: user.id, name: user.name, department: user.department } });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

// 4. Get Workouts (with optional search/filters)
app.get("/api/workouts", async (req, res) => {
  try {
    const workouts = await getWorkouts();
    res.json(workouts);
  } catch (error) {
    console.error("GET /api/workouts error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการโหลดรายการออกกำลังกาย" });
  }
});

// 5. Add Workout Record
app.post("/api/workouts", async (req, res) => {
  const { userId, date, submissionFormat, period, activityType, steps, calories, imageUrl } = req.body;

  if (!userId || !date || !submissionFormat || !period || !activityType) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" });
  }

  try {
    const users = await getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "ไม่พบข้อมูลพนักงานในระบบ" });
    }

    const newWorkout: Workout = {
      id: `w-${Date.now()}`,
      userId,
      userName: user.name,
      date,
      submissionFormat,
      period,
      activityType,
      steps: Number(steps) || 0,
      calories: Number(calories) || 0,
      imageUrl: imageUrl || "",
      createdAt: new Date().toISOString(),
    };

    await addWorkout(newWorkout);

    res.json({ success: true, workout: newWorkout });
  } catch (error) {
    console.error("POST /api/workouts error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลออกกำลังกาย" });
  }
});

// TARGET GOOGLE DRIVE FOLDER ID
const TARGET_DRIVE_FOLDER_ID = "1lwcXFQnb8BaqxiBYpavpXsr629jBiydc";

// 8. Direct Upload to Central Google Drive Folder without user OAuth login
app.post("/api/upload-drive", async (req, res) => {
  const { fileData, fileName, mimeType, customAppsScriptUrl } = req.body;

  if (!fileData) {
    return res.status(400).json({ error: "ไม่พบข้อมูลรูปภาพที่ต้องการอัปโหลด" });
  }

  try {
    const appsScriptUrl = customAppsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL;

    if (appsScriptUrl) {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderId: TARGET_DRIVE_FOLDER_ID,
          fileName: fileName || `gpo-workout-${Date.now()}.jpg`,
          mimeType: mimeType || "image/jpeg",
          fileData,
        }),
      });

      const result = await response.json();
      if (result && result.fileUrl) {
        return res.json({ success: true, imageUrl: result.fileUrl, folderId: TARGET_DRIVE_FOLDER_ID });
      }
    }

    // Fallback if Apps Script is not connected: return optimized data URL
    const dataUrl = fileData.startsWith("data:") ? fileData : `data:${mimeType || "image/jpeg"};base64,${fileData}`;
    return res.json({
      success: true,
      imageUrl: dataUrl,
      isFallback: true,
      folderId: TARGET_DRIVE_FOLDER_ID,
      message: "อัปโหลดรูปภาพหลักฐานเรียบร้อยแล้ว",
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ" });
  }
});

// 6. Delete Workout
app.delete("/api/workouts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await deleteWorkout(id);
    if (!deleted) {
      return res.status(404).json({ error: "ไม่พบรายการออกกำลังกายนี้" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workouts error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบรายการออกกำลังกาย" });
  }
});

// 7. Get leaderboard & stats (aggregated)
app.get("/api/summary", async (req, res) => {
  try {
    const [workouts, users] = await Promise.all([
      getWorkouts(),
      getUsers()
    ]);

    // Leaderboard calculations
    const leaderboardMap: { [key: string]: { userName: string; totalSteps: number; totalCalories: number; totalDurationMinutes: number; totalWorkouts: number } } = {};
    
    // Initialize with all users so they are listed in rankings even if 0 workouts
    users.forEach((u) => {
      leaderboardMap[u.id] = {
        userName: u.name,
        totalSteps: 0,
        totalCalories: 0,
        totalDurationMinutes: 0,
        totalWorkouts: 0,
      };
    });

    // Aggregate stats
    let totalSteps = 0;
    let totalCalories = 0;
    let totalDurationMinutes = 0;
    let totalWorkouts = workouts.length;

    const byActivity: { [key: string]: { steps: number; calories: number; count: number } } = {};

    workouts.forEach((w) => {
      const dur = w.durationMinutes || 0;
      totalSteps += w.steps;
      totalCalories += w.calories;
      totalDurationMinutes += dur;

      // Leaderboard
      if (leaderboardMap[w.userId]) {
        leaderboardMap[w.userId].totalSteps += w.steps;
        leaderboardMap[w.userId].totalCalories += w.calories;
        leaderboardMap[w.userId].totalDurationMinutes += dur;
        leaderboardMap[w.userId].totalWorkouts += 1;
      }

      // By Activity
      if (!byActivity[w.activityType]) {
        byActivity[w.activityType] = { steps: 0, calories: 0, count: 0 };
      }
      byActivity[w.activityType].steps += w.steps;
      byActivity[w.activityType].calories += w.calories;
      byActivity[w.activityType].count += 1;
    });

    const leaderboard: LeaderboardEntry[] = Object.keys(leaderboardMap).map((userId) => ({
      userId,
      userName: leaderboardMap[userId].userName,
      totalSteps: leaderboardMap[userId].totalSteps,
      totalCalories: leaderboardMap[userId].totalCalories,
      totalDurationMinutes: leaderboardMap[userId].totalDurationMinutes,
      totalWorkouts: leaderboardMap[userId].totalWorkouts,
    })).sort((a, b) => b.totalSteps - a.totalSteps); // Ranked by steps by default

    // Inject rank
    leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    res.json({
      stats: {
        totalSteps,
        totalCalories,
        totalDurationMinutes,
        totalWorkouts,
        byActivity,
      },
      leaderboard,
    });
  } catch (error) {
    console.error("GET /api/summary error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการโหลดผลสรุปสถิติ" });
  }
});

// Start Vite middleware or static serving
async function startServer() {
  // Seed database if empty
  await seedInitialDataIfEmpty();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
