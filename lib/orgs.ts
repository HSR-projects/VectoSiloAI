import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Org, OrgMember, OrgMemberRole, OrgMemberStatus, OrgRequest } from "@/types";
import { readDB as readAuth, writeDB as writeAuth } from "./auth";

const DATA_DIR = path.join(process.cwd(), "data");
const ORGS_PATH = path.join(DATA_DIR, "orgs.json");

interface OrgsDB {
  orgs: Org[];
}

export async function readDB(): Promise<OrgsDB> {
  try {
    const raw = await fs.readFile(ORGS_PATH, "utf8");
    return JSON.parse(raw) as OrgsDB;
  } catch {
    return { orgs: [] };
  }
}

export async function writeDB(db: OrgsDB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ORGS_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function createOrg(name: string, ownerId: string, ownerName: string, ownerEmail: string): Promise<Org> {
  const db = await readDB();
  if (db.orgs.some((o) => o.ownerId === ownerId)) {
    throw new Error("You already own an organization.");
  }
  const org: Org = {
    id: randomBytes(8).toString("hex"),
    name: name.trim().slice(0, 100),
    ownerId,
    plan: "ultra",
    members: [
      {
        userId: ownerId,
        name: ownerName,
        email: ownerEmail,
        role: "admin",
        status: "active",
        joinedAt: Date.now(),
      },
    ],
    requests: [],
    createdAt: Date.now(),
  };
  db.orgs.push(org);
  await writeDB(db);
  return org;
}

export async function getOrg(orgId: string): Promise<Org | null> {
  const db = await readDB();
  return db.orgs.find((o) => o.id === orgId) ?? null;
}

export async function getOrgByOwner(userId: string): Promise<Org | null> {
  const db = await readDB();
  return db.orgs.find((o) => o.ownerId === userId) ?? null;
}

export async function getOrgByMember(userId: string): Promise<Org | null> {
  const db = await readDB();
  return db.orgs.find((o) => o.members.some((m) => m.userId === userId)) ?? null;
}

export async function requestJoinOrg(
  orgId: string,
  userId: string,
  name: string,
  email: string
): Promise<OrgRequest> {
  const db = await readDB();
  const org = db.orgs.find((o) => o.id === orgId);
  if (!org) throw new Error("Organization not found.");
  if (org.members.some((m) => m.userId === userId)) throw new Error("You are already a member.");
  if (org.requests.some((r) => r.userId === userId && r.status === "pending"))
    throw new Error("You already have a pending request.");

  const authDb = await readAuth();
  const user = authDb.users.find((u) => u.id === userId);

  const request: OrgRequest = {
    id: randomBytes(8).toString("hex"),
    userId,
    name,
    email,
    plan: user?.plan ?? "free",
    status: "pending",
    createdAt: Date.now(),
  };
  org.requests.push(request);
  await writeDB(db);
  return request;
}

export async function reviewJoinRequest(
  orgId: string,
  requestId: string,
  adminId: string,
  approve: boolean,
  plan?: string
): Promise<OrgRequest> {
  const db = await readDB();
  const org = db.orgs.find((o) => o.id === orgId);
  if (!org) throw new Error("Organization not found.");
  if (!org.members.some((m) => m.userId === adminId && m.role === "admin"))
    throw new Error("Only admins can review requests.");

  const req = org.requests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") throw new Error("Request not found or already reviewed.");

  req.status = approve ? "approved" : "rejected";
  req.reviewedAt = Date.now();

  if (approve) {
    org.members.push({
      userId: req.userId,
      name: req.name,
      email: req.email,
      role: "member",
      status: "active",
      joinedAt: Date.now(),
    });
    const authDb = await readAuth();
    const user = authDb.users.find((u) => u.id === req.userId);
    if (user && plan && (plan === "pro" || plan === "max")) {
      user.plan = plan;
      await writeAuth(authDb);
    }
  }
  await writeDB(db);
  return req;
}

export async function updateMemberStatus(
  orgId: string,
  adminId: string,
  targetUserId: string,
  status: OrgMemberStatus
): Promise<OrgMember> {
  const db = await readDB();
  const org = db.orgs.find((o) => o.id === orgId);
  if (!org) throw new Error("Organization not found.");
  if (!org.members.some((m) => m.userId === adminId && m.role === "admin"))
    throw new Error("Only admins can manage members.");
  if (targetUserId === org.ownerId && status !== "active")
    throw new Error("Cannot disable or remove the owner.");

  const member = org.members.find((m) => m.userId === targetUserId);
  if (!member) throw new Error("Member not found.");

  if (status === "excluded") {
    // Refund the most recent org-seat payment if one exists
    if (member.razorpayOrderId) {
      try {
        const { default: Razorpay } = await import("razorpay");
        const rzp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID!,
          key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });
        const order = await rzp.orders.fetch(member.razorpayOrderId);
        if (order.status === "paid") {
          const payments = await rzp.orders.fetchPayments(member.razorpayOrderId);
          if (payments.items?.[0]?.id) {
            await rzp.payments.refund(payments.items[0].id, {});
          }
        }
      } catch {
        // Refund failure is non-fatal — continue with removal
      }
    }
    // Downgrade the employee back to free
    try {
      const authDb = await readAuth();
      const user = authDb.users.find((u) => u.id === targetUserId);
      if (user && user.plan !== "ultra") {
        user.plan = "free";
        await writeAuth(authDb);
      }
    } catch {
      // Downgrade failure is non-fatal
    }
    org.members = org.members.filter((m) => m.userId !== targetUserId);
    await writeDB(db);
    return member;
  }
  member.status = status;
  await writeDB(db);
  return member;
}

export async function listOrgMembers(orgId: string, requesterId: string): Promise<OrgMember[]> {
  const db = await readDB();
  const org = db.orgs.find((o) => o.id === orgId);
  if (!org) throw new Error("Organization not found.");
  if (!org.members.some((m) => m.userId === requesterId))
    throw new Error("You are not a member of this org.");
  return org.members;
}
