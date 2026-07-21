import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProject, incrementDownload } from "@/lib/teach/store";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = getProject(user?.id || "", projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const modelDir = path.join(process.cwd(), "data", "teach", "models", projectId);
  const tfjsDir = path.join(modelDir, "tfjs");

  if (!fs.existsSync(tfjsDir)) {
    return NextResponse.json({ error: "TF.js export not available. Train the model first." }, { status: 400 });
  }

  incrementDownload(projectId);

  const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name} - ML Model</title>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
    video, canvas, img { max-width: 100%; border-radius: 12px; margin: 10px 0; }
    button { padding: 10px 24px; font-size: 16px; border: none; border-radius: 8px; background: #10a37f; color: white; cursor: pointer; }
    button:hover { opacity: 0.9; }
    #result { margin-top: 20px; font-size: 18px; font-weight: bold; }
    .bar { height: 24px; margin: 4px 0; border-radius: 4px; transition: width 0.3s; text-align: left; padding-left: 8px; color: white; font-size: 13px; line-height: 24px; }
  </style>
</head>
<body>
  <h1>${project.name}</h1>
  <p>${project.description || "Trained with VectoSiloAI Teachable Machine"}</p>

  <div>
    <video id="webcam" autoplay playsinline style="display:none"></video>
    <canvas id="canvas" style="display:none"></canvas>
    <input type="file" id="upload" accept="image/*" />
  </div>

  <button id="btnWebcam">Use Webcam</button>
  <button id="btnPredict" disabled>Predict</button>

  <div id="result"></div>
  <div id="confidence"></div>

  <script>
    const CLASSES = ${JSON.stringify(project.classes.map(c => c.name))};
    let model = null;
    let useWebcam = false;
    let stream = null;

    async function loadModel() {
      model = await tf.loadLayersModel('./model.json');
      document.getElementById('btnPredict').disabled = false;
    }

    function preprocess(img) {
      const tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(127.5)
        .sub(1)
        .expandDims(0);
      return tensor;
    }

    async function predict() {
      if (!model) return;
      let img;
      if (useWebcam) {
        const video = document.getElementById('webcam');
        const canvas = document.getElementById('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        img = canvas;
      } else {
        img = document.getElementById('upload').files[0];
        if (!img) return;
        const bmp = await createImageBitmap(img);
        const canvas = document.getElementById('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        canvas.getContext('2d').drawImage(bmp, 0, 0);
        img = canvas;
      }

      const tensor = preprocess(img);
      const preds = await model.predict(tensor);
      const values = preds.dataSync();
      const topIdx = values.indexOf(Math.max(...values));

      const resultDiv = document.getElementById('result');
      resultDiv.textContent = \`Prediction: \${CLASSES[topIdx]} (\${(values[topIdx] * 100).toFixed(1)}%)\`;

      const confDiv = document.getElementById('confidence');
      confDiv.innerHTML = CLASSES.map((c, i) =>
        \`<div class="bar" style="width:\${values[i] * 100}%;background:#10a37f">\${c}: \${(values[i] * 100).toFixed(1)}%</div>\`
      ).join('');
    }

    document.getElementById('btnWebcam').onclick = async () => {
      useWebcam = true;
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      document.getElementById('webcam').srcObject = stream;
      document.getElementById('webcam').style.display = 'block';
      document.getElementById('upload').style.display = 'none';
    };

    document.getElementById('btnPredict').onclick = predict;
    loadModel();
  </script>
</body>
</html>`;

  // Build zip using jszip
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  // Add TF.js model files
  for (const file of fs.readdirSync(tfjsDir)) {
    zip.file(file, fs.readFileSync(path.join(tfjsDir, file)));
  }

  // Add classes.json
  const classesPath = path.join(modelDir, "classes.json");
  if (fs.existsSync(classesPath)) {
    zip.file("classes.json", fs.readFileSync(classesPath));
  }

  // Add sample HTML
  zip.file("index.html", sampleHtml);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(zipBuffer as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.name.replace(/\s+/g, "_")}_model.zip"`,
    },
  });
}
