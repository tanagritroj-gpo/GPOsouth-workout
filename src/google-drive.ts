import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebase-client";
import config from "../firebase-applet-config.json";

export const TARGET_DRIVE_FOLDER_ID = "1ffm16XKeu8IV5o38-nQKMijIAuIR-KI7";

const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
];

const TOKEN_KEY = "gpo_drive_access_token";

let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

/**
 * Process OAuth redirect results if returning from OAuth flow.
 */
export async function handleDriveRedirectResult(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // 1. Check URL hash for OAuth implicit token (#access_token=...)
  if (window.location.hash.includes("access_token=")) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get("access_token");
    if (token) {
      cachedAccessToken = token;
      localStorage.setItem(TOKEN_KEY, token);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return token;
    }
  }

  // 2. Check Firebase Redirect result
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        cachedAccessToken = token;
        localStorage.setItem(TOKEN_KEY, token);
        return token;
      }
    }
  } catch (error) {
    console.warn("Error processing Firebase redirect result:", error);
  }

  // 3. Return cached token from localStorage
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem(TOKEN_KEY);
  }
  return cachedAccessToken;
}

/**
 * Initiates Google Sign-In with Drive permissions.
 * Prefers Popup mode, falls back to Redirect mode.
 */
export async function signInWithGoogleDrive(): Promise<string> {
  const provider = new GoogleAuthProvider();
  DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));

  // Try popup mode first
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) {
      cachedAccessToken = token;
      localStorage.setItem(TOKEN_KEY, token);
      return token;
    }
  } catch (popupErr: any) {
    console.warn("Popup blocked or failed, trying redirect mode...", popupErr);
  }

  // Fallback to OAuth Redirect
  try {
    await signInWithRedirect(auth, provider);
    return "";
  } catch (redirectErr: any) {
    console.warn("Firebase redirect failed, trying direct Google OAuth endpoint...", redirectErr);

    const clientId = (config as any).oAuthClientId;
    if (clientId) {
      const redirectUri = window.location.origin + window.location.pathname;
      const oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent(DRIVE_SCOPES.join(" "))}&` +
        `prompt=consent`;

      window.location.href = oauthUrl;
      return "";
    }

    throw new Error(redirectErr.message || "ไม่สามารถเชื่อมต่อ Google OAuth ได้");
  }
}

export function getCachedDriveToken(): string | null {
  if (!cachedAccessToken && typeof window !== "undefined") {
    cachedAccessToken = localStorage.getItem(TOKEN_KEY);
  }
  return cachedAccessToken;
}

export function clearCachedDriveToken() {
  cachedAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Uploads an image file directly into Google Drive folder.
 * Returns the viewable Google Drive URL (`https://lh3.googleusercontent.com/d/FILE_ID`).
 */
export async function uploadImageToGoogleDrive(
  file: File,
  accessToken: string
): Promise<{ imageUrl: string; isTargetFolder: boolean }> {
  let fileId: string | null = null;

  try {
    // Attempt upload strictly into target organizational folder
    fileId = await performDriveUpload(file, [TARGET_DRIVE_FOLDER_ID], accessToken);
  } catch (err: any) {
    console.error("Failed to upload directly into target folder 1ffm16XKeu8IV5o38-nQKMijIAuIR-KI7:", err);
    clearCachedDriveToken();
    const msg = err.message || "";
    if (msg.includes("401") || msg.includes("403") || msg.toLowerCase().includes("invalid")) {
      throw new Error("สิทธิ์ Google Drive หมดอายุ หรือบัญชีที่เลือกไม่มีสิทธิ์เขียนในโฟลเดอร์ 1ffm16XKeu8IV5o38-nQKMijIAuIR-KI7 กรุณากดปุ่มเชื่อมต่อ Google Account อีกครั้ง");
    }
    throw new Error(`ไม่สามารถอัปโหลดไปยังโฟลเดอร์องค์กรได้: ${msg}`);
  }

  if (!fileId) {
    throw new Error("ไม่สามารถสร้างไฟล์ใน Google Drive ได้");
  }

  // Set permissions so anyone with the link can view the image
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&supportsTeamDrives=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    });
  } catch (err) {
    console.warn("Could not set permission on uploaded drive file:", err);
  }

  // Direct viewable CDN URL from Google Drive
  const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
  return { imageUrl, isTargetFolder: true };
}

async function performDriveUpload(
  file: File,
  parents: string[],
  accessToken: string
): Promise<string> {
  const metadata: any = {
    name: file.name || `gpo-workout-${Date.now()}.jpg`,
    mimeType: file.type || "image/jpeg",
  };

  if (parents && parents.length > 0) {
    metadata.parents = parents;
  }

  const boundary = "gpo_workout_drive_boundary_" + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadataPart =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type || "image/jpeg"}\r\n\r\n`;

  const fileBuffer = await file.arrayBuffer();

  const multipartBlob = new Blob(
    [
      metadataPart,
      new Uint8Array(fileBuffer),
      closeDelim,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  // Add supportsAllDrives=true & supportsTeamDrives=true for Google Workspace Shared Drives and shared folders
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&supportsTeamDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBlob,
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 || res.status === 403) {
      clearCachedDriveToken();
    }
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.id;
}
