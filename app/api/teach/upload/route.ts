import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/teach/store";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const projectId = form.get("projectId") as string;
  const classId = form.get("classId") as string;
  const file = form.get("file") as File;

  if (!projectId || !classId || !file) {
    return NextResponse.json({ error: "projectId, classId, and file required" }, { status: 400 });
  }

  const project = getProject(user.id, projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const cls = project.classes.find((c) => c.id === classId);
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // Reject SVG files — they can't be decoded as bitmaps
  const head = buffer.slice(0, 4).toString("utf8");
  if (head.startsWith("<svg") || head.startsWith("<?xm")) {
    return NextResponse.json({ error: "SVG files are not supported. Upload PNG or JPEG images." }, { status: 400 });
  }

  let processed: Buffer;
  let saveExt: string;
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

  if (ext === "json") {
    processed = buffer;
    saveExt = "feat.json";
  } else {
    if (ext === "png") saveExt = "png";
    else if (ext === "webp") saveExt = "webp";
    else saveExt = "jpg";

    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(buffer);
      const meta = await img.metadata();
      if (!meta.format || meta.format === "svg") {
        return NextResponse.json({ error: "Unsupported image format. Upload PNG, JPG, JPEG, or WEBP." }, { status: 400 });
      }
      const size = Math.max(meta.width || 224, meta.height || 224);
      
      const format = saveExt === "png" ? "png" : saveExt === "webp" ? "webp" : "jpeg";
      processed = await img
        .resize(size, size, { fit: "cover", position: "center" })
        .toFormat(format, { quality: 90 })
        .toBuffer();
    } catch (e) {
      console.warn("Sharp processing failed, falling back to raw buffer:", (e as Error).message);
      processed = buffer;
    }
  }

  const { saveSample } = await import("@/lib/teach/store");
  const sample = saveSample(projectId, classId, processed, saveExt);
  cls.sampleCount++;

  const { updateProject } = await import("@/lib/teach/store");
  updateProject(project);

  return NextResponse.json({ success: true, sample });
}
