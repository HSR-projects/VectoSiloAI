import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest, { params }: { params: { sampleId: string } }) {
  const { sampleId } = params;
  // Search for the sample file across all project dirs
  const dataDir = process.env.TEACH_DATA_DIR || path.join(process.cwd(), "data", "teach");
  const samplesRoot = path.join(dataDir, "samples");
  if (!fs.existsSync(samplesRoot)) return new NextResponse("Not found", { status: 404 });

  for (const projDir of fs.readdirSync(samplesRoot)) {
    const sDir = path.join(samplesRoot, projDir);
    if (!fs.statSync(sDir).isDirectory()) continue;
    const metaFile = path.join(sDir, `${sampleId}.json`);
    if (fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
      const filePath = meta.filePath;
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        let contentType: string;
        if (ext === ".json") contentType = "application/json";
        else if (ext === ".png") contentType = "image/png";
        else if (ext === ".webp") contentType = "image/webp";
        else contentType = "image/jpeg";
        const data = fs.readFileSync(filePath);
        return new NextResponse(data, {
          headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
        });
      }
    }
  }
  return new NextResponse("Not found", { status: 404 });
}
