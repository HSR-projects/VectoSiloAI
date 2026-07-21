import qrcode from "qrcode";
import path from "path";
import type { ProjectFile } from "@/types";

// WhatsApp client types (defined locally to avoid dependency issues)
interface WhatsAppClient {
  initialize: () => Promise<void>;
  destroy: () => Promise<void>;
  on: (event: string, listener: (...args: any[]) => void) => void;
  sendMessage: (to: string, content: string | any, options?: any) => Promise<any>;
}

// Module-level variables for whatsapp-web.js classes (loaded dynamically)
let WhatsAppClient: any = null;
let LocalAuth: any = null;
let MessageMedia: any = null;

async function loadWhatsAppLibrary(): Promise<boolean> {
  try {
    // @ts-ignore - dynamic import for optional dependency
    const mod = await import("whatsapp-web.js");
    WhatsAppClient = mod.Client;
    LocalAuth = mod.LocalAuth;
    MessageMedia = mod.MessageMedia;
    return true;
  } catch (error) {
    console.warn("[WhatsApp] whatsapp-web.js not available:", (error as Error).message);
    return false;
  }
}

function sanitizeError(error: Error): string {
  let msg = error.message;
  // Hide internal paths
  msg = msg.replace(/[/\\]home[/\\][^/\\]+/g, "[HOME]");
  msg = msg.replace(/[/\\]Users[/\\][^/\\]+/g, "[USERS]");
  msg = msg.replace(/[/\\]tmp[/\\][^/\\]+/g, "[TMP]");
  msg = msg.replace(/[/\\]var[/\\]www[/\\][^/\\]+/g, "[WWW]");
  msg = msg.replace(/\/home\/hemesh\/VectoSiloAI\/VectoSiloAI/g, "[APP]");
  msg = msg.replace(/\/home\/hemesh/g, "[HOME]");
  return msg;
}

interface WhatsAppSession {
  client: any | null;
  status: "disconnected" | "qr" | "connecting" | "connected" | "error";
  qrCode: string | null;
  userId: string;
  phoneNumber: string;
  useSelfChat: boolean;
  lastQRUpdate: number;
  reconnectAttempts: number;
  lastReconnectTime: number;
  browserLock: boolean;
}

const sessions = new Map<string, WhatsAppSession>();
const connectionLocks = new Map<string, Promise<{ qrCode: string } | { error: string }>>();

export function getSession(userId: string): WhatsAppSession | undefined {
  return sessions.get(userId);
}

export function createSession(userId: string, phoneNumber: string, useSelfChat: boolean): WhatsAppSession {
  const session: WhatsAppSession = {
    client: null,
    status: "disconnected",
    qrCode: null,
    userId,
    phoneNumber,
    useSelfChat,
    lastQRUpdate: 0,
    reconnectAttempts: 0,
    lastReconnectTime: 0,
    browserLock: false,
  };
  sessions.set(userId, session);
  return session;
}

export function deleteSession(userId: string): void {
  const session = sessions.get(userId);
  if (session?.client) {
    session.client.destroy().catch(() => {});
  }
  sessions.delete(userId);
  connectionLocks.delete(userId);
}

export async function connectWhatsApp(userId: string): Promise<{ qrCode: string } | { error: string }> {
  // Return existing connection attempt if in progress
  const existingLock = connectionLocks.get(userId);
  if (existingLock) {
    return existingLock;
  }

  const session = sessions.get(userId);
  if (!session) {
    return { error: "Session not found" };
  }

  // Already connected - return current QR (which will be null for connected)
  if (session.status === "connected" && session.client) {
    return { qrCode: session.qrCode || "" };
  }

  // If already has QR, return it instead of creating new connection
  if (session.status === "qr" && session.qrCode) {
    return { qrCode: session.qrCode };
  }

  // Check if browser is already locked for this session
  if (session.browserLock) {
    return { error: "Browser already running. Try disconnecting first." };
  }

  // Reconnect attempt limiting (max 40 attempts per session)
  const now = Date.now();
  if (session.reconnectAttempts >= 40) {
    const timeSinceLastAttempt = now - session.lastReconnectTime;
    if (timeSinceLastAttempt < 30 * 60 * 1000) { // 30 minutes cooldown
      return { error: "Too many reconnect attempts. Wait 30 minutes before trying again." };
    }
    // Reset counter after cooldown
    session.reconnectAttempts = 0;
  }

  // Create a new connection attempt with lock
  const connectionPromise = (async () => {
    const libLoaded = await loadWhatsAppLibrary();
    if (!libLoaded) {
      return { error: "WhatsApp library not installed. Run: npm install whatsapp-web.js" };
    }

    // Check if another connection attempt is already running
    if (session.browserLock) {
      return { error: "Browser already starting. Please wait." };
    }

    // Lock the browser for this session
    session.browserLock = true;
    session.status = "connecting";
    session.qrCode = null;
    session.reconnectAttempts += 1;
    session.lastReconnectTime = Date.now();

    try {
      const client = new WhatsAppClient({
        authStrategy: new LocalAuth({ 
          clientId: `vectosilo-${userId}`,
          dataPath: path.join(process.cwd(), ".wwebjs_auth"),
        }),
        puppeteer: {
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--disable-extensions",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-device-discovery-notifications",
          ],
        },
      });

      session.client = client;

      client.on("qr", async (qr: string) => {
        session.status = "qr";
        session.qrCode = await qrcode.toDataURL(qr);
        session.lastQRUpdate = Date.now();
        console.log(`[WhatsApp] QR code generated for user ${userId}`);
      });

      client.on("ready", () => {
        session.status = "connected";
        session.qrCode = null;
        session.reconnectAttempts = 0; // Reset on successful connection
        session.browserLock = false;
        console.log(`[WhatsApp] Client ready for user ${userId}`);
      });

      client.on("authenticated", () => {
        console.log(`[WhatsApp] Authenticated for user ${userId}`);
      });

      client.on("auth_failure", (msg: string) => {
        session.status = "error";
        session.browserLock = false;
        console.error(`[WhatsApp] Auth failure for user ${userId}:`, msg);
      });

      client.on("disconnected", (reason: string) => {
        session.status = "disconnected";
        session.client = null;
        session.browserLock = false;
        console.log(`[WhatsApp] Disconnected for user ${userId}:`, reason);
        
        // Auto-reconnect after a short delay (unless manually disconnected)
        if (reason !== "NAVIGATION" && reason !== "LOGOUT") {
          setTimeout(() => {
            console.log(`[WhatsApp] Attempting to reconnect for user ${userId}...`);
            connectWhatsApp(userId).catch(err => {
              console.error(`[WhatsApp] Reconnect failed for ${userId}:`, err);
            });
          }, 10000); // 10 second delay before reconnect
        }
      });

      client.on("message", async (msg: any) => {
        if (msg.fromMe) return;
        await handleIncomingMessage(userId, msg);
      });

      await client.initialize();
      return { qrCode: session.qrCode || "" };
    } catch (error) {
      session.status = "error";
      session.browserLock = false;
      console.error(`[WhatsApp] Connection error for user ${userId}:`, error);
      return { error: sanitizeError(error as Error) };
    } finally {
      connectionLocks.delete(userId);
    }
  })();

  connectionLocks.set(userId, connectionPromise);
  return connectionPromise;
}

async function handleIncomingMessage(userId: string, msg: any): Promise<void> {
  try {
    const session = sessions.get(userId);
    if (!session || session.status !== "connected") return;

    let text = msg.body || "";
    let mediaData: { mimeType: string; data: string; filename?: string } | null = null;

    if (msg.hasMedia) {
      const media = await msg.downloadMedia();
      if (media) {
        mediaData = {
          mimeType: media.mimetype,
          data: media.data,
          filename: media.filename,
        };
      }
    }

    const isSelfChat = session.useSelfChat;
    const targetChat = isSelfChat ? msg.from : session.phoneNumber;

    if (msg.from !== targetChat && !isSelfChat) return;

    await forwardToVectoSiloAI(userId, text, mediaData, msg.from);
  } catch (error) {
    console.error("[WhatsApp] Error handling message:", error);
  }
}

async function forwardToVectoSiloAI(
  userId: string,
  text: string,
  media: { mimeType: string; data: string; filename?: string } | null,
  fromNumber: string
): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: text,
        threadHistory: [],
        focusMode: "all",
        provider: "vectosiloai",
        whatsappUserId: userId,
        whatsappContext: {
          from: fromNumber,
          hasMedia: !!media,
          mediaMimeType: media?.mimeType,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Chat API failed");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload) continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "token") {
              fullResponse += ev.content;
            }
          } catch { }
        }
      }
    }

    if (fullResponse) {
      const session = sessions.get(userId);
      if (session?.client && session.status === "connected") {
        const targetChat = session.useSelfChat ? fromNumber : session.phoneNumber;
        await session.client.sendMessage(targetChat, fullResponse);
      }
    }
  } catch (error) {
    console.error("[WhatsApp] Error forwarding to VectoSiloAI:", error);
  }
}

export async function sendWhatsAppMessage(
  userId: string,
  to: string,
  text: string,
  media?: { mimeType: string; data: string; filename?: string }
): Promise<boolean> {
  const session = sessions.get(userId);
  if (!session?.client || session.status !== "connected") {
    return false;
  }

  try {
    if (media) {
      const messageMedia = new MessageMedia(media.mimeType, media.data, media.filename);
      await session.client.sendMessage(to, messageMedia, { caption: text });
    } else {
      await session.client.sendMessage(to, text);
    }
    return true;
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
    return false;
  }
}

export async function getWhatsAppStatus(userId: string): Promise<{
  status: WhatsAppSession["status"];
  qrCode: string | null;
  phoneNumber: string;
  useSelfChat: boolean;
}> {
  const session = sessions.get(userId);
  if (!session) {
    return { status: "disconnected", qrCode: null, phoneNumber: "", useSelfChat: false };
  }
  return {
    status: session.status,
    qrCode: session.qrCode,
    phoneNumber: session.phoneNumber,
    useSelfChat: session.useSelfChat,
  };
}

export function cleanupInactiveSessions(maxAgeMs = 30 * 60 * 1000): void {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (session.status === "qr" && now - session.lastQRUpdate > maxAgeMs) {
      deleteSession(userId);
    }
  }
}

setInterval(cleanupInactiveSessions, 5 * 60 * 1000);

// Auto-reconnect existing sessions on server startup
export async function restoreSessions(): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const authDir = path.join(process.cwd(), ".wwebjs_auth");
  
  if (!fs.existsSync(authDir)) return;
  
  const entries = fs.readdirSync(authDir);
  for (const entry of entries) {
    const match = entry.match(/^session-vectosilo-(.+)$/);
    if (match) {
      const userId = match[1];
      console.log(`[WhatsApp] Restoring session for user ${userId}`);
      createSession(userId, "", true); // self-chat mode
      // Attempt to reconnect in background
      connectWhatsApp(userId).catch(err => {
        console.error(`[WhatsApp] Failed to restore session for ${userId}:`, err);
      });
    }
  }
}

// Call restore on module load (server startup)
restoreSessions().catch(console.error);