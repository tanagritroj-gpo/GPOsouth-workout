const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0309015147";
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCwW0ikefuXgi-oE14_W2h0YciH1BHoAk4";
const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-gposouthworkouts-72aed3a5-5bbb-46b6-862a-fd279d089e8d";

function parseVal(v: any): any {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return Boolean(v.booleanValue);
  if (v.mapValue !== undefined) {
    const fields = v.mapValue.fields || {};
    const res: any = {};
    for (const k of Object.keys(fields)) res[k] = parseVal(fields[k]);
    return res;
  }
  if (v.arrayValue !== undefined) {
    const values = v.arrayValue.values || [];
    return values.map((item: any) => parseVal(item));
  }
  return Object.values(v)[0];
}

function parseDoc(docObj: any): any {
  if (!docObj || !docObj.fields) return null;
  const fields = docObj.fields;
  const result: any = {};
  for (const k of Object.keys(fields)) {
    result[k] = parseVal(fields[k]);
  }
  return result;
}

async function fetchCollectionRest(collectionName: string): Promise<any[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/${collectionName}?key=${FIREBASE_API_KEY}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) return [];
    return data.documents.map(parseDoc).filter(Boolean);
  } catch (err) {
    return [];
  }
}

import { getUsers, getWorkouts, getInitialMockData } from "../firebase-db";

function buildDefaultFlexMessage(top5: Array<{ userName: string; totalSteps: number }>, stats: { totalSteps: number; totalWorkouts: number }, appUrl: string) {
  const todayTh = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const urlToUse = appUrl || "https://ais-pre-gauxwisqu5lug66cyjaqqs-433778356972.asia-southeast1.run.app";

  const top5Contents = top5.length === 0
    ? [
        {
          type: "text",
          text: "ยังไม่มีข้อมูลบันทึกการออกกำลังกายในสัปดาห์นี้",
          size: "xs",
          color: "#94A3B8",
          align: "center",
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
              flex: 1,
            },
            {
              type: "text",
              text: item.userName,
              size: "xs",
              weight: "bold",
              color: "#1E293B",
              flex: 4,
              margin: "sm",
            },
            {
              type: "text",
              text: `${item.totalSteps.toLocaleString()} ก้าว`,
              size: "xs",
              weight: "bold",
              color: "#006241",
              align: "end",
              flex: 3,
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

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { channelAccessToken, token, targetId, flexMessage, appUrl } = req.body || {};
    const tokenToUse = (channelAccessToken || token || process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
    const targetToUse = (targetId || process.env.LINE_TARGET_ID || "").trim();

    if (!tokenToUse) {
      return res.status(400).json({
        success: false,
        error: "กรุณาระบุ LINE Channel Access Token ก่อนทำรายการ"
      });
    }

    let finalFlexMessage = flexMessage;

    if (!finalFlexMessage) {
      // Generate default Leaderboard Flex Message from database/data
      try {
        let users = await fetchCollectionRest("users");
        let workouts = await fetchCollectionRest("workouts");

        if (!users || users.length === 0 || !workouts || workouts.length === 0) {
          const mockData = getInitialMockData();
          users = mockData.users;
          workouts = mockData.workouts;
        }

        const userStepMap: Record<string, { userName: string; totalSteps: number }> = {};
        let totalSteps = 0;

        users.forEach((u: any) => {
          if (u && u.id) {
            userStepMap[u.id] = { userName: u.name || "ผู้ใช้งาน", totalSteps: 0 };
          }
        });

        workouts.forEach((w: any) => {
          if (!w) return;
          const steps = Number(w.steps) || 0;
          totalSteps += steps;
          const uId = w.userId;
          if (uId && userStepMap[uId]) {
            userStepMap[uId].totalSteps += steps;
          } else if (uId) {
            userStepMap[uId] = {
              userName: w.userName || "ผู้ใช้งาน",
              totalSteps: steps,
            };
          }
        });

        let leaderboard = Object.values(userStepMap)
          .filter((u) => u.totalSteps > 0)
          .sort((a, b) => b.totalSteps - a.totalSteps);

        if (leaderboard.length === 0) {
          const mockData = getInitialMockData();
          const mockUserStepMap: Record<string, { userName: string; totalSteps: number }> = {};
          mockData.workouts.forEach((w) => {
            if (!mockUserStepMap[w.userId]) {
              mockUserStepMap[w.userId] = { userName: w.userName, totalSteps: 0 };
            }
            mockUserStepMap[w.userId].totalSteps += w.steps;
          });
          leaderboard = Object.values(mockUserStepMap).sort((a, b) => b.totalSteps - a.totalSteps);
        }

        const top5 = leaderboard.slice(0, 5);
        finalFlexMessage = buildDefaultFlexMessage(top5, { totalSteps, totalWorkouts: workouts.length }, appUrl);
      } catch (e) {
        console.warn("Could not generate dynamic leaderboard for Flex message:", e);
        // Fallback to static sample leaderboard
        finalFlexMessage = buildDefaultFlexMessage(
          [
            { userName: "ภก.สมชาย ใจดี", totalSteps: 45200 },
            { userName: "คุณวิภาวรรณ สุขเสริฐ", totalSteps: 38900 },
            { userName: "คุณธนกร สุขภาพดี", totalSteps: 31500 },
          ],
          { totalSteps: 115600, totalWorkouts: 42 },
          appUrl
        );
      }
    }

    const messages = [finalFlexMessage];

    let endpoint = "https://api.line.me/v2/bot/message/broadcast";
    let bodyPayload: any = { messages };

    if (targetToUse) {
      endpoint = "https://api.line.me/v2/bot/message/push";
      bodyPayload = {
        to: targetToUse,
        messages
      };
    }

    const lineResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenToUse}`
      },
      body: JSON.stringify(bodyPayload)
    });

    const responseText = await lineResponse.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    if (lineResponse.ok) {
      return res.status(200).json({
        success: true,
        message: "ส่งข้อความ LINE Flex Message สรุปอันดับประจำสัปดาห์เรียบร้อยแล้ว! 🏆🎉",
        data: responseData
      });
    }

    let errorMessage = responseData.message || `LINE API ตอบกลับรหัส ${lineResponse.status}`;
    if (lineResponse.status === 401) {
      errorMessage = "LINE Channel Access Token ไม่ถูกต้องหรือหมดอายุ (401 Unauthorized)";
    } else if (lineResponse.status === 400) {
      errorMessage = `ข้อผิดพลาดใน Flex Message หรือ Target ID: ${responseData.message || responseText}`;
    }

    return res.status(400).json({
      success: false,
      error: errorMessage,
      details: responseData
    });
  } catch (error: any) {
    console.error("Direct Line Send Function Error:", error);
    return res.status(500).json({
      success: false,
      error: `เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ${error.message || "Unknown error"}`
    });
  }
}

