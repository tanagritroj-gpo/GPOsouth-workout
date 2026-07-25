import app from "../server";

export default function handler(req: any, res: any) {
  return new Promise((resolve, reject) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    res.on("error", reject);
    try {
      app(req, res);
    } catch (err) {
      console.error("Vercel Serverless Function error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ (Server Error)" });
      }
      resolve(null);
    }
  });
}

