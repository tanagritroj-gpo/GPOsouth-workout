import express from "express";
import path from "path";
import crypto from "crypto";
import cron from "node-cron";
import { User, Workout, LeaderboardEntry } from "./src/types";
import {
  getUsers,
  addUser,
  getWorkouts,
  addWorkout,
  deleteWorkout,
  seedInitialDataIfEmpty,
  getInitialMockData,
  getAdminDb
} from "./firebase-db";

const app = express();
const PORT = 3000;

// Capture the raw body alongside the parsed JSON — the LINE webhook signature
// (x-line-signature) is an HMAC over the exact raw bytes, which body-parser
// consumes before we'd otherwise be able to see them.
app.use(express.json({
  limit: "10mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

// Enable CORS for Vercel and cross-origin requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Normalize URL for Vercel serverless function routing if running on Vercel
app.use((req, res, next) => {
  const forwardedUri = (req.headers["x-forwarded-uri"] as string) || (req.headers["x-matched-path"] as string);
  if (forwardedUri && forwardedUri.startsWith("/api")) {
    req.url = forwardedUri;
  } else if (process.env.VERCEL && req.url && !req.url.startsWith("/api") && !req.url.startsWith("/_")) {
    req.url = "/api" + (req.url.startsWith("/") ? "" : "/") + req.url;
  }
  next();
});

// Auto Scheduler Configuration State (LINE Messaging API)
let lineConfig = {
  enabled: true,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  targetId: process.env.LINE_TARGET_ID || "",
  cronExpression: "0 8 * * 1", // Every Monday at 08:00 AM
  lastSentAt: null as string | null,
  lastStatus: "ยังไม่มีการส่งข้อความ" as string,
};

// Helper function to build LINE Flex Message Object
function buildFlexMessage(
  top5: { userName: string; totalSteps: number; totalCalories: number }[],
  stats: { totalSteps: number; totalWorkouts: number },
  appUrl: string = process.env.APP_URL || "https://ais-dev-gauxwisqu5lug66cyjaqqs-433778356972.asia-southeast1.run.app"
) {
  let urlToUse = (appUrl || "").trim();
  if (!urlToUse) {
    urlToUse = "https://ais-dev-gauxwisqu5lug66cyjaqqs-433778356972.asia-southeast1.run.app";
  } else if (!urlToUse.startsWith("http://") && !urlToUse.startsWith("https://")) {
    urlToUse = "https://" + urlToUse;
  }

  const todayTh = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const top5Contents = top5.length === 0
    ? [
        {
          type: "text",
          text: "ยังไม่มีรายการบันทึกผลประจำสัปดาห์นี้",
          size: "xs",
          color: "#94A3B8",
          align: "center",
          margin: "md",
        },
      ]
    : top5.map((item, idx) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
        const medalBg = idx === 0 ? "#FEF3C7" : idx === 1 ? "#F1F5F9" : idx === 2 ? "#FFEDD5" : "#F8FAFC";
        const rankColor = idx === 0 ? "#D97706" : idx === 1 ? "#475569" : idx === 2 ? "#C2410C" : "#64748B";

        return {
          type: "box",
          layout: "horizontal",
          backgroundColor: medalBg,
          cornerRadius: "md",
          paddingAll: "8px",
          margin: "xs",
          alignItems: "center",
          contents: [
            {
              type: "text",
              text: medal,
              size: "xs",
              weight: "bold",
              color: rankColor,
              flex: 0,
            },
            {
              type: "text",
              text: item.userName,
              size: "xs",
              weight: "bold",
              color: "#1E293B",
              flex: 1,
              margin: "sm",
            },
            {
              type: "text",
              text: `${item.totalSteps.toLocaleString()} ก้าว`,
              size: "xs",
              weight: "bold",
              color: "#006241",
              align: "end",
              flex: 0,
            },
          ],
        };
      });

  return {
    type: "flex",
    altText: `🏆 [GPO South Healthy Life] สรุปตาราง Leaderboard ประจำสัปดาห์ (${todayTh})`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#006241",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "GPO SOUTH HEALTHY LIFE 🏃‍♂️",
            color: "#cba258",
            weight: "bold",
            size: "xs",
          },
          {
            type: "text",
            text: "🏆 สรุปอันดับประจำสัปดาห์",
            color: "#FFFFFF",
            weight: "bold",
            size: "lg",
            margin: "xs",
          },
          {
            type: "text",
            text: `ประจำวันที่ ${todayTh}`,
            color: "#d4e9e2",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "🥇 Top 5 ผู้นำก้าวเดินสูงสุดประจำสัปดาห์",
            weight: "bold",
            color: "#006241",
            size: "xs",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: top5Contents,
          },
          {
            type: "separator",
            margin: "md",
            color: "#E2E8F0",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📊 ก้าวเดินสะสมรวมองค์กร:", size: "xs", color: "#64748B", flex: 3 },
                  { type: "text", text: `${stats.totalSteps.toLocaleString()} ก้าว`, size: "xs", color: "#006241", weight: "bold", align: "end", flex: 2 },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📝 บันทึกสุขภาพรวม:", size: "xs", color: "#64748B", flex: 3 },
                  { type: "text", text: `${stats.totalWorkouts.toLocaleString()} รายการ`, size: "xs", color: "#006241", weight: "bold", align: "end", flex: 2 },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F8FAFC",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "ดูอันดับ & บันทึกผล",
              uri: urlToUse,
            },
            style: "primary",
            color: "#006241",
            height: "sm",
          },
        ],
      },
    },
  };
}

// Helper function to generate and send Monday Leaderboard Flex Message via LINE Messaging API
async function sendMondayLeaderboardToLine(forcedChannelToken?: string, forcedTargetId?: string, customFlexMessage?: any) {
  let channelToken = (forcedChannelToken && forcedChannelToken.trim()) || "";
  // If provided token is masked (contains '...'), fall back to saved lineConfig or env
  if (!channelToken || channelToken.includes("...")) {
    channelToken = lineConfig.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  }

  const targetId = forcedTargetId !== undefined && forcedTargetId !== null
    ? forcedTargetId.trim()
    : (lineConfig.targetId || process.env.LINE_TARGET_ID || "");

  let workouts: Workout[] = [];
  let users: User[] = [];
  try {
    const [w, u] = await Promise.all([
      getWorkouts().catch(() => []),
      getUsers().catch(() => [])
    ]);
    workouts = w || [];
    users = u || [];
  } catch (err) {
    console.error("Error fetching data for LINE notification:", err);
    workouts = [];
    users = [];
  }

  // Leaderboard calculations
  const leaderboardMap: { [key: string]: { userName: string; totalSteps: number; totalCalories: number; totalWorkouts: number } } = {};
  users.forEach((u) => {
    if (u && u.id) {
      leaderboardMap[u.id] = { userName: u.name || "ผู้ใช้งาน", totalSteps: 0, totalCalories: 0, totalWorkouts: 0 };
    }
  });

  let totalSteps = 0;
  let totalWorkouts = workouts.length;

  workouts.forEach((w) => {
    if (!w) return;
    const steps = Number(w.steps) || 0;
    const calories = Number(w.calories) || 0;
    totalSteps += steps;

    const uid = w.userId || `user_${w.userName || "unknown"}`;
    if (!leaderboardMap[uid]) {
      leaderboardMap[uid] = {
        userName: w.userName || "ผู้ใช้งาน",
        totalSteps: 0,
        totalCalories: 0,
        totalWorkouts: 0,
      };
    }
    leaderboardMap[uid].totalSteps += steps;
    leaderboardMap[uid].totalCalories += calories;
    leaderboardMap[uid].totalWorkouts += 1;
  });

  const leaderboard = Object.keys(leaderboardMap)
    .map((userId) => ({
      userName: leaderboardMap[userId].userName,
      totalSteps: leaderboardMap[userId].totalSteps,
      totalCalories: leaderboardMap[userId].totalCalories,
      totalWorkouts: leaderboardMap[userId].totalWorkouts,
    }))
    .filter((item) => item.totalSteps > 0)
    .sort((a, b) => b.totalSteps - a.totalSteps);

  const top5 = leaderboard.slice(0, 5);
  const flexMessageObject = customFlexMessage || buildFlexMessage(top5, { totalSteps, totalWorkouts });

  if (!channelToken) {
    lineConfig.lastStatus = `จำลองส่ง Flex Message สำเร็จเวลา ${new Date().toLocaleTimeString('th-TH')} (โปรดใส่ Channel Access Token ในตั้งค่าเพื่อส่งจริง)`;
    lineConfig.lastSentAt = new Date().toISOString();
    return {
      success: true,
      isSimulated: true,
      message: "จำลองการส่ง Flex Message สำเร็จ! (โปรดใส่ Channel Access Token ในส่วนตั้งค่าเพื่อส่งเข้า LINE จริง)",
      flexMessage: flexMessageObject,
    };
  }

  // Choose LINE Messaging API endpoint: Push API if targetId exists, otherwise Broadcast API
  const endpoint = targetId
    ? "https://api.line.me/v2/bot/message/push"
    : "https://api.line.me/v2/bot/message/broadcast";

  const payload: any = {
    messages: [flexMessageObject]
  };
  if (targetId) {
    payload.to = targetId;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      const targetDesc = targetId ? `ไปยัง ID: ${targetId}` : "แบบ Broadcast ให้ทุกคน";
      lineConfig.lastStatus = `ส่ง Flex Message ${targetDesc} สำเร็จเวลา ${new Date().toLocaleTimeString('th-TH')}`;
      lineConfig.lastSentAt = new Date().toISOString();
      return {
        success: true,
        message: `ส่ง Flex Message ${targetDesc} สำเร็จแล้ว!`,
        flexMessage: flexMessageObject,
      };
    } else {
      let rawError = data.message || (data.details && data.details[0] && data.details[0].message) || "LINE Messaging API ปฏิเสธคำขอ";
      if (response.status === 401 || rawError.includes("Authentication failed")) {
        rawError = "LINE Channel Access Token ไม่ถูกต้องหรือหมดอายุ (401 Unauthorized) กรุณาตรวจสอบและบันทึก Token ฉบับเต็มในหน้าตั้งค่า";
      }
      lineConfig.lastStatus = `ล้มเหลว: ${rawError}`;
      return {
        success: false,
        error: rawError,
        flexMessage: flexMessageObject,
      };
    }
  } catch (err: any) {
    const errorMsg = err.message || 'เกิดข้อผิดพลาดในการส่ง LINE';
    lineConfig.lastStatus = `ล้มเหลว: ${errorMsg}`;
    return {
      success: false,
      error: errorMsg,
      flexMessage: flexMessageObject,
    };
  }
}

// Setup Built-in Server Cron Job for Every Monday at 8:00 AM (Asia/Bangkok)
if (!process.env.VERCEL) {
  try {
    cron.schedule("0 8 * * 1", async () => {
      if (!lineConfig.enabled) {
        console.log("[Auto-Cron] Monday LINE Messaging API Broadcast is disabled in settings.");
        return;
      }
      console.log("[Auto-Cron] Running Monday morning auto Flex Message broadcast to LINE...");
      try {
        const res = await sendMondayLeaderboardToLine();
        console.log("[Auto-Cron] Flex Message Broadcast status:", res.message);
      } catch (err: any) {
        console.error("[Auto-Cron] Flex Message Broadcast failed:", err.message);
      }
    }, {
      timezone: "Asia/Bangkok"
    });
  } catch (err) {
    console.warn("Notice: Could not schedule node-cron:", err);
  }
}

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

// 8. LINE Notification Endpoints & Scheduler Control (LINE Messaging API)
app.get(["/api/line/settings", "/line/settings"], (req, res) => {
  res.json({
    enabled: lineConfig.enabled,
    hasToken: Boolean(lineConfig.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN),
    maskedToken: lineConfig.channelAccessToken ? `${lineConfig.channelAccessToken.substring(0, 8)}...` : "",
    targetId: lineConfig.targetId,
    cronExpression: lineConfig.cronExpression,
    lastSentAt: lineConfig.lastSentAt,
    lastStatus: lineConfig.lastStatus,
    scheduleText: "ทุกเช้าวันจันทร์ เวลา 08:00 น. (อัตโนมัติจาก Server)",
  });
});

app.post(["/api/line/settings", "/line/settings"], (req, res) => {
  const { enabled, channelAccessToken, token, targetId } = req.body || {};
  if (typeof enabled === "boolean") {
    lineConfig.enabled = enabled;
  }
  const newToken = (channelAccessToken || token || "").trim();
  if (newToken && !newToken.includes("...")) {
    lineConfig.channelAccessToken = newToken;
  }
  if (typeof targetId === "string") {
    lineConfig.targetId = targetId.trim();
  }
  res.json({
    success: true,
    message: "บันทึกการตั้งค่า LINE Messaging API เรียบร้อยแล้ว",
    settings: {
      enabled: lineConfig.enabled,
      hasToken: Boolean(lineConfig.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN),
      targetId: lineConfig.targetId,
      scheduleText: "ทุกเช้าวันจันทร์ เวลา 08:00 น. (อัตโนมัติจาก Server)",
    },
  });
});

app.post(["/api/line/trigger-auto", "/line/trigger-auto"], async (req, res) => {
  try {
    const result = await sendMondayLeaderboardToLine();
    res.json(result);
  } catch (error: any) {
    console.error("Trigger auto error:", error);
    res.status(400).json({ error: error.message || "เกิดข้อผิดพลาดในการรันระบบส่งอัตโนมัติ" });
  }
});

app.post(["/api/line/notify", "/line/notify", "/api/line-send", "/line-send"], async (req, res) => {
  const { channelAccessToken, token, targetId, flexMessage } = req.body || {};
  const tokenToUse = channelAccessToken || token;

  try {
    const result = await sendMondayLeaderboardToLine(tokenToUse, targetId, flexMessage);
    return res.json(result);
  } catch (error: any) {
    console.error("POST /api/line/notify error:", error);
    res.status(400).json({ error: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE Messaging API" });
  }
});

// TEMPORARY: LINE webhook used only to discover a group's ID once the bot is
// invited into it (the Messaging API has no "list my groups" endpoint — the
// group ID only ever shows up in an event payload). Safe to remove/disable
// once the target group's ID has been captured and configured.
app.post(["/api/line/webhook", "/line/webhook"], async (req: any, res) => {
  // Ack immediately — LINE expects a fast response and retries on timeout/non-200.
  res.status(200).json({ received: true });

  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const signature = req.headers["x-line-signature"] as string | undefined;

    if (channelSecret) {
      const expected = crypto.createHmac("sha256", channelSecret).update(req.rawBody || Buffer.from("")).digest("base64");
      if (!signature || signature !== expected) {
        console.warn("LINE webhook: signature mismatch, ignoring payload");
        return;
      }
    } else {
      console.warn("LINE webhook: LINE_CHANNEL_SECRET not set — accepting payload unverified (temporary debug mode)");
    }

    const events = (req.body && req.body.events) || [];
    for (const event of events) {
      console.log("LINE webhook event:", JSON.stringify(event));
      try {
        const db = getAdminDb();
        await db.collection("_lineWebhookDebug").add({
          type: event.type,
          sourceType: event.source?.type || null,
          groupId: event.source?.groupId || null,
          roomId: event.source?.roomId || null,
          userId: event.source?.userId || null,
          messageText: event.message?.text || null,
          receivedAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.error("LINE webhook: failed to store debug event:", dbErr);
      }
    }
  } catch (error) {
    console.error("LINE webhook error:", error);
  }
});

// TEMPORARY: read back what the webhook above captured. Protected by the
// channel secret as a shared key so it isn't a wide-open public endpoint.
app.get(["/api/line/webhook-log", "/line/webhook-log"], async (req, res) => {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret || req.query.secret !== channelSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const db = getAdminDb();
    const snapshot = await db.collection("_lineWebhookDebug").orderBy("receivedAt", "desc").limit(20).get();
    const events = snapshot.docs.map((doc) => doc.data());
    res.json({ events });
  } catch (error: any) {
    console.error("GET /api/line/webhook-log error:", error);
    res.status(500).json({ error: error.message || "เกิดข้อผิดพลาด" });
  }
});

// Global Error Handler for API routes to ensure JSON response on Vercel
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled API Error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// Start Vite middleware or static serving
async function startServer() {
  // Seed database if empty
  await seedInitialDataIfEmpty().catch(() => {});

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite server creation failed:", err);
    }
  } else if (!process.env.VERCEL) {
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

// 404 Fallback for Vercel Serverless Function
if (process.env.VERCEL) {
  app.use((req, res) => {
    res.status(404).json({ error: `ไม่พบ API endpoint บนเซิร์ฟเวอร์: ${req.method} ${req.url}` });
  });
} else {
  startServer();
}

export default app;
