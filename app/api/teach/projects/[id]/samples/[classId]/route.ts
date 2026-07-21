import { NextRequest, NextResponse } from "next/server";
import { getClassSamples } from "@/lib/teach/store";
import path from "path";
import fs from "fs";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string; classId: string } }) {
  const { id, classId } = params;
  const samples = getClassSamples(id, classId);
  const dataDir = process.env.TEACH_DATA_DIR || path.join(process.cwd(), "data", "teach");

  const result = samples.map((s) => ({
    id: s.id,
    classId: s.classId,
    url: `/api/teach/samples/${s.id}`,
    timestamp: s.timestamp,
  }));

  return NextResponse.json({ samples: result });
}
