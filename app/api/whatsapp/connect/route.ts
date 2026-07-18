import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { effectiveCaps } from "@/lib/plans";
import { createSession as createWhatsAppSession, connectWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Try cookie-based auth first
  let user = await getCurrentUser();
  let userId: string | null = null;
  let userPlan: string | null = null;

  if (user) {
    userId = user.id;
    userPlan = user.plan;
  } else {
    // Fallback: password-based auth for WhatsApp linking
    let body: { phoneNumber?: string; useSelfChat?: boolean; password?: string; email?: string; silent?: boolean };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid body." }, { status: 400 });
    }

    if (body.email && body.password) {
      const { getUserByEmail } = await import("@/lib/auth");
      const foundUser = await getUserByEmail(body.email);
      if (foundUser && await verifyPassword(foundUser.passwordHash, body.password)) {
        user = foundUser;
        userId = user.id;
        userPlan = user.plan;
      }
    }
  }

  if (!user || !userId || !userPlan) {
    return Response.json({ error: "Authentication required. Provide email/password or sign in first." }, { status: 401 });
  }

  const caps = effectiveCaps(userPlan as import("@/types").Plan);
  if (!caps.computer) {
    return Response.json(
      { error: "WhatsApp integration requires Go plan or above." },
      { status: 402 }
    );
  }

  // Re-read body if we already parsed it
  let phoneNumber = "";
  let useSelfChat = false;
  let silent = false;
  try {
    const body = await req.json();
    phoneNumber = (body.phoneNumber || "").trim();
    useSelfChat = body.useSelfChat ?? false;
    silent = body.silent ?? false;
  } catch {
    // body already parsed
  }

  if (!useSelfChat && !phoneNumber) {
    return Response.json({ error: "Phone number required for separate number mode." }, { status: 400 });
  }

  createWhatsAppSession(userId, phoneNumber, useSelfChat);
  const result = await connectWhatsApp(userId);

  if ("error" in result) {
    // In silent mode, return generic error
    const errorMsg = silent ? "Connection failed. Try again." : result.error;
    return Response.json({ error: errorMsg }, { status: 500 });
  }

  return Response.json({
    qrCode: result.qrCode,
    status: "qr",
    phoneNumber,
    useSelfChat,
  });
}