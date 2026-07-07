import { NextRequest, NextResponse } from "next/server";

const WS_HOST = process.env.WS_HOST || "127.0.0.1";
const WS_PORT = process.env.WS_PORT || "3003";

/** Proxy token issuance to the WS server so the token store stays in one process. */
export async function POST(req: NextRequest) {
  const { containerId } = await req.json();

  if (!containerId || typeof containerId !== "string") {
    return NextResponse.json({ error: "containerId required" }, { status: 400 });
  }

  try {
    const res = await fetch(`http://${WS_HOST}:${WS_PORT}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ containerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Token request failed" }, { status: res.status });
    }
    return NextResponse.json({ token: data.token });
  } catch {
    return NextResponse.json({ error: "Could not reach WS server" }, { status: 502 });
  }
}