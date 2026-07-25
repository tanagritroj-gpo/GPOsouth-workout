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
    const { channelAccessToken, token, targetId, flexMessage } = req.body || {};
    const tokenToUse = (channelAccessToken || token || process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
    const targetToUse = (targetId || process.env.LINE_TARGET_ID || "").trim();

    if (!tokenToUse) {
      return res.status(400).json({
        success: false,
        error: "กรุณาระบุ LINE Channel Access Token ก่อนทำรายการ"
      });
    }

    // Default simple message or custom Flex Message
    const messages = flexMessage
      ? [flexMessage]
      : [
          {
            type: "text",
            text: "📲 ทดสอบการเชื่อมต่อ LINE Messaging API สำเร็จ! (ระบบพร้อมส่ง Flex Message แล้ว)"
          }
        ];

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
        message: "ส่งข้อความ LINE Flex Message เรียบร้อยแล้ว! 🎉",
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
