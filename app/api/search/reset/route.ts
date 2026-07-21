import { NextResponse } from "next/server";
import { resetSearchBackend } from "@/lib/searxng";

export async function POST() {
  const result = await resetSearchBackend();
  if (result.success) {
    return NextResponse.json(result);
  }
  return NextResponse.json(result, { status: 500 });
}
