import { getCurrentUser } from "@/lib/auth";
import { effectiveCaps } from "@/lib/plans";
import { getWhatsAppStatus } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const caps = effectiveCaps(user.plan);
  if (!caps.computer) {
    return Response.json(
      { error: "WhatsApp integration requires Go plan or above." },
      { status: 402 }
    );
  }

  const status = await getWhatsAppStatus(user.id);
  return Response.json(status);
}