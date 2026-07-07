import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Gift, Plan } from "@/types";
import { readDB as readAuthDB, writeDB as writeAuthDB } from "./auth";

const DATA_DIR = path.join(process.cwd(), "data");
const GIFTS_PATH = path.join(DATA_DIR, "gifts.json");

interface GiftsDB {
  gifts: Gift[];
}

async function readDB(): Promise<GiftsDB> {
  try {
    const raw = await fs.readFile(GIFTS_PATH, "utf8");
    return JSON.parse(raw) as GiftsDB;
  } catch {
    return { gifts: [] };
  }
}

async function writeDB(db: GiftsDB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(GIFTS_PATH, JSON.stringify(db, null, 2), "utf8");
}

function generateGiftCode(): string {
  return "KODA-" + randomBytes(4).toString("hex").toUpperCase();
}

export async function createGift(
  plan: Plan,
  fromUserId: string,
  fromName: string,
  toEmail?: string
): Promise<Gift> {
  if (plan !== "pro" && plan !== "max") {
    throw new Error("Only Pro and Max can be gifted.");
  }
  const db = await readDB();
  const gift: Gift = {
    id: randomBytes(8).toString("hex"),
    code: generateGiftCode(),
    plan,
    fromUserId,
    fromName,
    toEmail: toEmail?.toLowerCase().trim(),
    status: "pending",
    createdAt: Date.now(),
  };
  db.gifts.push(gift);
  await writeDB(db);
  return gift;
}

export async function redeemGift(code: string, userId: string): Promise<{ plan: Plan; fromName: string }> {
  const db = await readDB();
  const gift = db.gifts.find((g) => g.code === code.toUpperCase().trim());
  if (!gift) throw new Error("Invalid gift code.");
  if (gift.status !== "pending") throw new Error("This gift has already been used.");
  if (gift.toEmail) {
    const authDb = await readAuthDB();
    const user = authDb.users.find((u) => u.id === userId);
    if (!user || user.email.toLowerCase() !== gift.toEmail) {
      throw new Error("This gift is not for your email address.");
    }
  }

  gift.status = "redeemed";
  gift.toUserId = userId;
  gift.redeemedAt = Date.now();
  await writeDB(db);

  // Apply the gifted plan to the user
  const authDb = await readAuthDB();
  const user = authDb.users.find((u) => u.id === userId);
  if (user) {
    user.plan = gift.plan;
    await writeAuthDB(authDb);
  }

  return { plan: gift.plan, fromName: gift.fromName };
}

export async function listUserGifts(userId: string): Promise<Gift[]> {
  const db = await readDB();
  return db.gifts.filter((g) => g.fromUserId === userId || g.toUserId === userId);
}

export async function getGiftByCode(code: string): Promise<Gift | null> {
  const db = await readDB();
  return db.gifts.find((g) => g.code === code.toUpperCase().trim()) ?? null;
}
