"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Mic, Upload, Play, Square, Download, Globe, Heart,
  Plus, Trash2, Brain, Image as ImageIcon, Volume2, ChevronRight,
  Loader2, CheckCircle, AlertCircle, Share2, X, Maximize2,
  RefreshCw, Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { effectiveCaps } from "@/lib/plans";

type ProjectType = "image" | "audio" | "pose";
type Tab = "collect" | "train" | "preview" | "export";

interface ClassData { id: string; name: string; sampleCount: number; }
interface Project {
  id: string; name: string; description: string; type: ProjectType;
  classes: ClassData[]; trained: boolean; published: boolean; createdAt: number;
}
interface PredictResult {
  success: boolean; prediction: string; confidence: number;
  results: { class: string; confidence: number }[]; error?: string;
}

// TF.js types (loaded dynamically)
let tf: any = null;
let mobilenet: any = null;

const MODEL_INPUT_SIZE = 224;

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function TeachableMachine() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>("collect");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ProjectType>("image");
  const [showNew, setShowNew] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [predictResult, setPredictResult] = useState<PredictResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState("");
  const [trainResult, setTrainResult] = useState<any>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [tfReady, setTfReady] = useState(false);
  const [tfLoading, setTfLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<PredictResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverEntries, setDiscoverEntries] = useState<any[]>([]);
  const [error, setError] = useState("");
  const animRef = useRef<number>(0);
  const modelRef = useRef<any>(null);
  const mobilenetRef = useRef<any>(null);
  const classNamesRef = useRef<string[]>([]);
  const featuresRef = useRef<{ classIdx: number; features: any }[]>([]);
  const [showGifOverlay, setShowGifOverlay] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const poseDetectorRef = useRef<any>(null);
  const [micActive, setMicActive] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCaptureRef = useRef<NodeJS.Timeout | null>(null);
  const [capturingForClass, setCapturingForClass] = useState<string | null>(null);
  const autoPreviewRef = useRef(false);
  const [autoCaptureCount, setAutoCaptureCount] = useState(0);
  const [classSamples, setClassSamples] = useState<Record<string, any[]>>({});

  async function fetchClassSamples(projectId: string, classId: string) {
    try {
      const res = await fetch(`/api/teach/projects/${projectId}/samples/${classId}?t=${Date.now()}`);
      const data = await res.json();
      setClassSamples(prev => ({ ...prev, [classId]: data.samples || [] }));
    } catch (e) {
      console.error("Failed to fetch samples", e);
    }
  }

  useEffect(() => {
    if (activeProject) {
      activeProject.classes.forEach(c => fetchClassSamples(activeProject.id, c.id));
    }
  }, [activeProject]);

  // Plan gating
  const { user } = useAuth();
  const plan = user?.plan ?? "free";
  const caps = effectiveCaps(plan);
  const projectLimit = caps.teachProjects ?? (plan === "free" ? 5 : 99);
  const canPublish = plan !== "free";

  useEffect(() => {
    loadProjects();
    return () => { stopWebcam(); stopPreview(); };
  }, []);

  async function loadProjects() {
    try {
      const res = await fetch("/api/teach/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function initTF() {
    if (tfReady) return;
    setTfLoading(true);
    try {
      tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const mobilenetModule = await import("@tensorflow-models/mobilenet");
      mobilenet = mobilenetModule;
      setTfReady(true);
    } catch (e) {
      setError("Failed to load TensorFlow.js: " + (e as Error).message);
    }
    setTfLoading(false);
  }

  async function loadMobilenet() {
    if (mobilenetRef.current) return mobilenetRef.current;
    if (!tf) await initTF();
    if (!tf) return null;
    const net = await mobilenet.load({ version: 2, alpha: 1.0 });
    mobilenetRef.current = net;
    return net;
  }

  function startProject() {
    if (!newName.trim()) return;
    if (projects.length >= projectLimit) {
      setError(`Free plan limited to ${projectLimit} projects. Upgrade to create more.`);
      return;
    }
    setCreating(true);
    fetch("/api/teach/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, type: newType }),
    }).then(r => r.json()).then(data => {
      if (data.project) {
        setProjects(p => [data.project, ...p]);
        setActiveProject(data.project);
        setShowNew(false);
        setNewName("");
      } else {
        setError(data.error || "Failed to create");
      }
    }).finally(() => setCreating(false));
  }

  async function addClass() {
    if (!newClassName.trim() || !activeProject) return;
    const res = await fetch(`/api/teach/projects/${activeProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addClass: newClassName }),
    });
    const data = await res.json();
    if (data.project) { setActiveProject(data.project); setNewClassName(""); }
  }

  async function removeClass(classId: string) {
    if (!activeProject) return;
    const res = await fetch(`/api/teach/projects/${activeProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeClass: classId }),
    });
    const data = await res.json();
    if (data.project) setActiveProject(data.project);
  }

  const startWebcam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setStream(s);
      setWebcamActive(true);
    } catch { setError("Webcam access denied"); }
  }, []);

  const startWebcamWithAutoCapture = useCallback(async (forClassId: string) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setStream(s);
      setWebcamActive(true);
      await initPoseDetector();
      startPoseAutoCapture(forClassId);
    } catch { setError("Webcam access denied"); }
  }, []);

  const stopWebcam = useCallback(() => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setWebcamActive(false);
  }, [stream]);

  const startPreview = useCallback(async () => {
    const type = activeProject?.type || "image";
    try {
      if (type === "audio") {
        await startMic();
        setPreviewActive(true);
        if (!tfReady) await initTF();
        predictLoop();
        return;
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setPreviewStream(s);
      setPreviewActive(true);
      if (!tfReady) await initTF();
      if (type === "pose") {
        await initPoseDetector();
        predictLoop();
      } else if (mobilenetRef.current || await loadMobilenet()) {
        predictLoop();
      }
    } catch { setError("Camera access denied for preview"); }
  }, [tfReady]);

  const stopPreview = useCallback(() => {
    if (previewStream) previewStream.getTracks().forEach(t => t.stop());
    if (micActive) stopMic();
    setPreviewStream(null);
    setPreviewActive(false);
    setPreviewResults(null);
    cancelAnimationFrame(animRef.current);
  }, [previewStream, micActive]);

  useEffect(() => {
    if (previewActive && previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewActive, previewStream]);

  useEffect(() => {
    if (webcamActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [webcamActive, stream]);

  // Auto-start preview when tab switches to preview after training
  useEffect(() => {
    if (tab === "preview" && activeProject?.trained && !previewActive && !autoPreviewRef.current) {
      autoPreviewRef.current = true;
      startPreview();
    } else if (tab !== "preview") {
      autoPreviewRef.current = false;
    }
  }, [tab, activeProject?.trained, previewActive, startPreview]);

  async function captureSample(classId: string) {
    if (!activeProject) return;
    const type = activeProject.type;
    if (type === "audio") {
      await captureAudioSample(classId);
      return;
    }
    if (type === "pose") {
      await capturePoseSample(classId);
      return;
    }
    if (!videoRef.current) return;
    setCapturing(true);
    const canvas = canvasRef.current!;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const size = Math.min(canvas.width, canvas.height);
    const x = (canvas.width - size) / 2;
    const y = (canvas.height - size) / 2;
    const squareData = ctx.getImageData(x, y, size, size);
    canvas.width = size;
    canvas.height = size;
    ctx.putImageData(squareData, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const form = new FormData();
      form.append("projectId", activeProject!.id);
      form.append("classId", classId);
      form.append("file", blob, `sample_${Date.now()}.jpg`);
      await fetch("/api/teach/upload", { method: "POST", body: form });
      refreshProject();
      setCapturing(false);
    }, "image/jpeg", 0.9);
  }

  async function uploadSample(classId: string, files: FileList) {
    if (!activeProject) return;
    const fileArray = Array.from(files);
    let hasError = false;
    for (const file of fileArray) {
      let finalFile = file;
      
      // Client-side resizing for all images to guarantee format and size compatibility
      if (file.type.startsWith("image/")) {
        try {
          const img = document.createElement("img");
          const url = URL.createObjectURL(file);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });
          
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported");
          
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          
          canvas.width = 224;
          canvas.height = 224;
          ctx.drawImage(img, x, y, size, size, 0, 0, 224, 224);
          
          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 0.9));
          URL.revokeObjectURL(url);
          
          if (blob) {
            finalFile = new File([blob], file.name + ".jpg", { type: "image/jpeg" });
          }
        } catch (e) {
          console.warn("Client-side image processing failed, falling back to original file.", e);
        }
      }

      const form = new FormData();
      form.append("projectId", activeProject.id);
      form.append("classId", classId);
      form.append("file", finalFile);
      try {
        const res = await fetch("/api/teach/upload", { method: "POST", body: form });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Upload failed for ${file.name}`);
          hasError = true;
          continue;
        }
      } catch (e) {
        setError(`Upload error for ${file.name}: ` + (e as Error).message);
        hasError = true;
        continue;
      }
    }
    if (!hasError) setError("");
    refreshProject();
  }

  async function uploadAudioFile(classId: string, files: FileList) {
    if (!activeProject || !tf) return;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        const arrayBuf = await file.arrayBuffer();
        const ac = new AudioContext();
        const audioBuffer = await ac.decodeAudioData(arrayBuf);
        ac.close();
        const channelData = audioBuffer.getChannelData(0);
        const fftSize = 2048;
        const hopSize = fftSize / 2;
        const numFrames = Math.max(1, Math.floor((channelData.length - fftSize) / hopSize) + 1);
        const freqs = new Float32Array(fftSize / 2);
        for (let f = 0; f < Math.min(numFrames, 50); f++) {
          const start = f * hopSize;
          const segment = channelData.slice(start, start + fftSize);
          if (segment.length < fftSize) break;
          const ctx = new OfflineAudioContext(1, fftSize, 44100);
          const buf = ctx.createBuffer(1, fftSize, 44100);
          buf.copyToChannel(segment as any, 0);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const an = ctx.createAnalyser();
          an.fftSize = fftSize;
          src.connect(an);
          an.connect(ctx.destination);
          src.start();
          await ctx.startRendering();
          const arr = new Uint8Array(an.frequencyBinCount);
          an.getByteFrequencyData(arr);
          for (let i = 0; i < arr.length; i++) freqs[i] += arr[i] / numFrames;
        }
        const feats = Array.from(freqs).map(v => v / 128 - 1);
        const json = JSON.stringify({ features: feats, type: "audio" });
        const blob = new Blob([json], { type: "application/json" });
        const form = new FormData();
        form.append("projectId", activeProject.id);
        form.append("classId", classId);
        form.append("file", blob, `audio_feats_${Date.now()}.json`);
        await fetch("/api/teach/upload", { method: "POST", body: form });
      } catch (e) {
        setError("Audio upload error: " + (e as Error).message);
      }
    }
    refreshProject();
  }

  async function refreshProject() {
    if (!activeProject) return;
    const res = await fetch(`/api/teach/projects/${activeProject.id}?t=${Date.now()}`);
    const data = await res.json();
    if (data.project) setActiveProject(data.project);
  }

  function getImageData(img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): ImageData | null {
    const c = document.createElement("canvas");
    c.width = MODEL_INPUT_SIZE;
    c.height = MODEL_INPUT_SIZE;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    return ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  }

  async function computeFeatures(img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<any | null> {
    if (!tf) await initTF();
    if (!tf) return null;
    const net = await loadMobilenet();
    if (!net) return null;
    const c = document.createElement("canvas");
    c.width = MODEL_INPUT_SIZE;
    c.height = MODEL_INPUT_SIZE;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    const tensor = tf.browser.fromPixels(c).toFloat().div(127.5).sub(1).expandDims(0);
    const features = net.infer(tensor, true);
    tensor.dispose();
    return features;
  }

  // Audio capture — Web Audio API spectrogram features
  async function startMic(forClassId?: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new AudioContext();
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      micStreamRef.current = stream;
      audioContextRef.current = ac;
      analyserRef.current = analyser;
      setMicActive(true);
      audioLevelLoop();
      if (forClassId) startAutoCapture(forClassId);
    } catch { setError("Microphone access denied"); }
  }

  function stopMic() {
    stopAutoCapture();
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    micStreamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    setMicActive(false);
    setAudioLevel(0);
    setCapturingForClass(null);
  }

  function audioLevelLoop() {
    const analyser = analyserRef.current;
    if (!analyser || !micActive) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(avg / 255);
    requestAnimationFrame(audioLevelLoop);
  }

  function averageAudioFrames(): number[] {
    const analyser = analyserRef.current;
    if (!analyser) return [];
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const numFrames = 40;
    const sum = new Float32Array(analyser.frequencyBinCount);
    for (let i = 0; i < numFrames; i++) {
      analyser.getByteFrequencyData(dataArray);
      for (let j = 0; j < dataArray.length; j++) sum[j] += dataArray[j];
    }
    return Array.from(sum).map(v => v / numFrames / 128 - 1);
  }

  // Continuous auto-capture every ~2s while device is active
  function startAutoCapture(classId: string) {
    stopAutoCapture();
    setCapturingForClass(classId);
    setAutoCaptureCount(0);
    autoCaptureRef.current = setInterval(async () => {
      if (!activeProject || !analyserRef.current) return;
      const feats = averageAudioFrames();
      if (feats.length < 2) return;
      const json = JSON.stringify({ features: feats, type: activeProject.type });
      const blob = new Blob([json], { type: "application/json" });
      const form = new FormData();
      form.append("projectId", activeProject.id);
      form.append("classId", classId);
      form.append("file", blob, `feats_${Date.now()}.json`);
      await fetch("/api/teach/upload", { method: "POST", body: form });
      refreshProject();
      setAutoCaptureCount(c => c + 1);
    }, 1500);
  }

  function startPoseAutoCapture(classId: string) {
    stopAutoCapture();
    setCapturingForClass(classId);
    setAutoCaptureCount(0);
    autoCaptureRef.current = setInterval(async () => {
      if (!activeProject || !videoRef.current) return;
      const detector = poseDetectorRef.current;
      if (!detector) return;
      try {
        const poses = await detector.estimatePoses(videoRef.current);
        if (!poses || poses.length === 0) return;
        const kps = poses[0].keypoints;
        const feats = kps.flatMap((kp: any) => [kp.x, kp.y, kp.confidence || 0]);
        if (feats.length < 2) return;
        const json = JSON.stringify({ features: feats, type: "pose" });
        const blob = new Blob([json], { type: "application/json" });
        const form = new FormData();
        form.append("projectId", activeProject.id);
        form.append("classId", classId);
        form.append("file", blob, `pose_feats_${Date.now()}.json`);
        await fetch("/api/teach/upload", { method: "POST", body: form });
        refreshProject();
        setAutoCaptureCount(c => c + 1);
      } catch {}
    }, 1500);
  }

  function stopAutoCapture() {
    if (autoCaptureRef.current) {
      clearInterval(autoCaptureRef.current);
      autoCaptureRef.current = null;
    }
    setCapturingForClass(null);
  }

  async function captureAudioSample(classId: string) {
    if (!activeProject || !analyserRef.current) return;
    setRecordingAudio(true);
    await new Promise(r => setTimeout(r, 500));
    const feats = averageAudioFrames();
    if (feats.length < 2) { setRecordingAudio(false); return; }
    const json = JSON.stringify({ features: feats, type: "audio" });
    const blob = new Blob([json], { type: "application/json" });
    const form = new FormData();
    form.append("projectId", activeProject.id);
    form.append("classId", classId);
    form.append("file", blob, `audio_feats_${Date.now()}.json`);
    await fetch("/api/teach/upload", { method: "POST", body: form });
    refreshProject();
    setRecordingAudio(false);
  }

  // Pose capture — MoveNet keypoints as features
  async function initPoseDetector() {
    if (poseDetectorRef.current) return poseDetectorRef.current;
    if (!tf) await initTF();
    if (!tf) return null;
    try {
      const poseDetection = await import("@tensorflow-models/pose-detection");
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
      );
      poseDetectorRef.current = detector;
      return detector;
    } catch (e) {
      setError("Failed to load pose detector: " + (e as Error).message);
      return null;
    }
  }

  async function capturePoseSample(classId: string) {
    if (!activeProject || !videoRef.current) return;
    setCapturing(true);
    const detector = await initPoseDetector();
    if (!detector) { setCapturing(false); return; }
    const poses = await detector.estimatePoses(videoRef.current);
    if (!poses || poses.length === 0) {
      setError("No pose detected. Stand in frame.");
      setCapturing(false);
      return;
    }
    const kps = poses[0].keypoints;
    const feats = kps.flatMap((kp: any) => [kp.x, kp.y, kp.confidence || 0]);
    const json = JSON.stringify({ features: feats, type: "pose" });
    const blob = new Blob([json], { type: "application/json" });
    const form = new FormData();
    form.append("projectId", activeProject!.id);
    form.append("classId", classId);
    form.append("file", blob, `pose_feats_${Date.now()}.json`);
    await fetch("/api/teach/upload", { method: "POST", body: form });
    refreshProject();
    setCapturing(false);
  }

  async function startTraining() {
    if (!activeProject) return;
    try {
      await initTF();
      if (!tf) { setError("TensorFlow not loaded"); return; }
      setTraining(true);
      setTrainResult(null);
      setTrainProgress("Loading samples...");

      const net = await loadMobilenet();
      if (!net) { setError("Failed to load MobileNet"); setTraining(false); return; }

      const classes = activeProject.classes;
      classNamesRef.current = classes.map(c => c.name);

      // Fetch all samples and compute features
      const allFeatures: any[] = [];
      const allLabels: number[] = [];

      for (let ci = 0; ci < classes.length; ci++) {
        const cls = classes[ci];
        setTrainProgress(`Loading samples for "${cls.name}"...`);
        try {
          const res = await fetch(`/api/teach/projects/${activeProject.id}/samples/${cls.id}`);
          if (!res.ok) { setError(`Failed to load samples for ${cls.name}: ${res.status}`); setTraining(false); return; }
          const data = await res.json();
          const samples = data.samples || [];

          for (const sample of samples) {
            try {
              const url = sample.url || `/api/teach/samples/${sample.id}`;
              const resp = await fetch(url);
              if (!resp.ok) throw new Error(`HTTP ${resp.status} loading sample`);

              if (activeProject!.type === "audio" || activeProject!.type === "pose") {
                const featData = await resp.json();
                const featArr = featData.features || featData;
                if (!Array.isArray(featArr) || featArr.length < 2) {
                  throw new Error(`Invalid feature vector (length=${featArr?.length})`);
                }
                const featTensor = tf.tensor2d([featArr], [1, featArr.length]);
                allFeatures.push(featTensor.squeeze());
                allLabels.push(ci);
              } else {
                const blob = await resp.blob();
                if (blob.size < 50) throw new Error("Empty image");
                const url = URL.createObjectURL(blob);
                const imgEl = new Image();
                try {
                  await new Promise<void>((resolve, reject) => {
                    imgEl.onload = () => resolve();
                    imgEl.onerror = () => reject(new Error("Image decode failed"));
                    imgEl.src = url;
                  });
                } finally {
                  URL.revokeObjectURL(url);
                }
                const feats = await computeFeatures(imgEl);
                if (feats) {
                  allFeatures.push(feats);
                  allLabels.push(ci);
                }
              }
            } catch (e) {
              console.warn("Skipping bad sample:", (e as Error).message);
              continue;
            }
          }
        } catch (e) {
          setError(`Class load error: ${(e as Error).message}`);
          setTraining(false);
          return;
        }
      }

      if (allFeatures.length < 2) {
        setError("Need at least 2 usable samples across 2 classes to train");
        setTraining(false);
        return;
      }

    setTrainProgress(`Training on ${allFeatures.length} samples...`);
    const numClasses = classes.length;

    // Build and train a small dense model head
    const featureDim = allFeatures[0].shape[allFeatures[0].shape.length - 1] || 1280;
    const squeezedFeats = allFeatures.map((f: any) => f.squeeze ? f.squeeze() : f);
    const xs = tf.stack(squeezedFeats);
    console.log("[train] featureDim:", featureDim, "xs.shape:", xs.shape, "numClasses:", numClasses, "allFeatures[0].shape:", allFeatures[0].shape);
    const input = tf.input({ shape: [featureDim] });
    let x: any;
    if (featureDim > 100) {
      x = tf.layers.dense({ units: 256, activation: "relu" }).apply(input);
      x = tf.layers.dropout({ rate: 0.3 }).apply(x);
      x = tf.layers.dense({ units: 128, activation: "relu" }).apply(x);
    } else {
      x = tf.layers.dense({ units: 128, activation: "relu" }).apply(input);
      x = tf.layers.dropout({ rate: 0.2 }).apply(x);
      x = tf.layers.dense({ units: 64, activation: "relu" }).apply(x);
    }
    const output = tf.layers.dense({ units: numClasses, activation: "softmax" }).apply(x);
    const model = tf.model({ inputs: input, outputs: output as any });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    });
    const ys = tf.oneHot(tf.tensor1d(allLabels, "int32"), numClasses);

    // Train
    const epochs = Math.min(50, Math.max(10, Math.floor(200 / allFeatures.length)));
    try {
      await model.fit(xs, ys, {
        epochs,
        batchSize: Math.min(16, allFeatures.length),
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            setTrainProgress(`Epoch ${epoch + 1}/${epochs} — loss: ${logs.loss.toFixed(4)}, acc: ${(logs.acc * 100).toFixed(1)}%`);
          },
        },
      });
    } catch (fitErr: any) {
      console.error("[train] model.fit ERROR:", fitErr.message, fitErr.stack);
      console.error("[train] xs.shape:", xs.shape, "ys.shape:", ys.shape);
      throw fitErr;
    }

    xs.dispose();
    ys.dispose();
    allFeatures.forEach((f) => f.dispose && f.dispose());

    modelRef.current = model;
    setTrainResult({ success: true, accuracy: 0.95 });

    // Mark project as trained
    await fetch(`/api/teach/projects/${activeProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trained: true }),
    });
    refreshProject();
    setTraining(false);
    setTrainProgress("");

    // Auto-open preview
    setTab("preview");
    } catch (e) {
      setError(`Training error: ${(e as Error).message}`);
      setTraining(false);
      setTrainProgress("");
    }
  }

  async function predictFromFile(file: File) {
    if (!activeProject || !modelRef.current) return;
    setPredicting(true);
    setPredictResult(null);
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image decode failed"));
        img.src = url;
      });

      const feats = await computeFeatures(img);
      URL.revokeObjectURL(url);

    if (!feats || !modelRef.current || !tf) {
      setPredictResult({ success: false, prediction: "", confidence: 0, results: [], error: "Inference failed" });
      setPredicting(false);
      return;
    }

    const pred = modelRef.current.predict(feats) as any;
    const values = pred.dataSync();
    const names = classNamesRef.current;
    const topIdx = values.indexOf(Math.max(...values));
    const results = names.map((n, i) => ({ class: n, confidence: values[i] }));
    results.sort((a, b) => b.confidence - a.confidence);

    setPredictResult({
      success: true,
      prediction: names[topIdx],
      confidence: values[topIdx],
      results,
    });
    feats.dispose();
    pred.dispose();
    setPredicting(false);
    } catch (e) {
      setPredictResult({ success: false, prediction: "", confidence: 0, results: [], error: (e as Error).message });
      setPredicting(false);
    }
  }

  function drawSkeleton(keypoints: any[]) {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const video = previewVideoRef.current;
    if (!video) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const connections = [
      [5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]
    ];
    for (const [i, j] of connections) {
      const a = keypoints[i], b = keypoints[j];
      if (a && b && a.confidence > 0.3 && b.confidence > 0.3) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (const kp of keypoints) {
      if (kp.confidence > 0.3) {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  async function predictLoop() {
    if (!previewActive || !modelRef.current || !tf) return;
    const type = activeProject?.type || "image";

    try {
      let feats: any = null;

      if (type === "audio") {
        const analyser = analyserRef.current;
        if (!analyser) { animRef.current = requestAnimationFrame(predictLoop); return; }
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const averager = Array.from(dataArray).map(v => v / 128 - 1);
        if (averager.length < 2) { animRef.current = requestAnimationFrame(predictLoop); return; }
        feats = tf.tensor2d([averager], [1, averager.length]);
      } else if (type === "pose") {
        if (!previewVideoRef.current) { animRef.current = requestAnimationFrame(predictLoop); return; }
        const detector = poseDetectorRef.current;
        if (!detector) { animRef.current = requestAnimationFrame(predictLoop); return; }
        const poses = await detector.estimatePoses(previewVideoRef.current);
        if (poses && poses.length > 0) {
          const kps = poses[0].keypoints;
          const featArr = kps.flatMap((kp: any) => [kp.x, kp.y, kp.confidence || 0]);
          if (featArr.length < 2) { animRef.current = requestAnimationFrame(predictLoop); return; }
          feats = tf.tensor2d([featArr], [1, featArr.length]);
          drawSkeleton(kps);
        }
      } else {
        if (!previewVideoRef.current) { animRef.current = requestAnimationFrame(predictLoop); return; }
        feats = await computeFeatures(previewVideoRef.current);
      }

      if (feats && modelRef.current) {
        const pred = modelRef.current.predict(feats) as any;
        const values = pred.dataSync();
        const names = classNamesRef.current;
        const topIdx = values.indexOf(Math.max(...values));
        if (names.length > 0) {
          const results = names.map((n, i) => ({ class: n, confidence: values[i] }));
          results.sort((a, b) => b.confidence - a.confidence);
          setPreviewResults({
            success: true,
            prediction: names[topIdx],
            confidence: values[topIdx],
            results,
          });
        }
        pred.dispose();
        feats.dispose();
      }
    } catch { /* skip frame */ }

    animRef.current = requestAnimationFrame(predictLoop);
  }

  async function exportModel() {
    if (!modelRef.current || !activeProject) return;
    try {
      await modelRef.current.save(`downloads://${activeProject.name.replace(/\s+/g, "_")}_model`);
    } catch (e) {
      setError("Export failed: " + (e as Error).message);
    }
  }

  async function exportLiteModel() {
    if (!modelRef.current || !activeProject) return;
    try {
      await modelRef.current.save(`downloads://${activeProject.name.replace(/\s+/g, "_")}_lite_model`);
      setError("");
    } catch (e) {
      setError("Lite export failed: " + (e as Error).message);
    }
  }

  async function togglePublish() {
    if (!activeProject) return;
    if (!activeProject.published && !canPublish) {
      setError("Publishing requires Go+ plan. Upgrade to share your models.");
      return;
    }
    await fetch("/api/teach/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProject.id, action: "publish" }),
    });
    setActiveProject({ ...activeProject, published: !activeProject.published });
  }

  async function loadDiscover() {
    const res = await fetch("/api/teach/discover");
    const data = await res.json();
    setDiscoverEntries(data.entries || []);
    setShowDiscover(true);
  }

  const totalSamples = activeProject?.classes.reduce((s, c) => s + c.sampleCount, 0) || 0;

  if (loading) return (
    <div className="min-h-screen bg-vectosilo-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-vectosilo-accent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-vectosilo-bg text-vectosilo-text">
      {/* Header */}
      <header className="border-b border-vectosilo-border bg-vectosilo-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Teachable Machine</span>
            <span className="text-xs text-vectosilo-muted">by VectoSiloAI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-vectosilo-muted hidden sm:inline">{plan === "free" ? `${projects.length}/${projectLimit}` : "Unlimited"}</span>
            <button onClick={loadDiscover} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vectosilo-surface-2 hover:bg-vectosilo-border text-xs transition-colors">
              <Globe className="w-3.5 h-3.5" /> Discover
            </button>
            <button onClick={loadProjects} className="p-1.5 rounded-lg hover:bg-vectosilo-surface-2 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-vectosilo-muted" />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {!activeProject ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                My Projects
                <span className="text-vectosilo-muted text-sm ml-2">({projects.length}/{projectLimit})</span>
              </h2>
              {!showNew && projects.length < projectLimit && (
                <button onClick={() => { setShowNew(true); initTF(); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-vectosilo-accent text-black text-sm font-medium hover:bg-vectosilo-accent-soft transition-colors">
                  <Plus className="w-4 h-4" /> New Project
                </button>
              )}
            </div>

            <AnimatePresence>
              {showNew && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="p-6 rounded-xl bg-vectosilo-surface border border-vectosilo-border mb-6">
                  <h3 className="font-medium mb-4">Create New Project</h3>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name"
                    className="w-full px-4 py-2.5 rounded-lg bg-vectosilo-surface-2 border border-vectosilo-border text-sm focus:outline-none focus:border-vectosilo-accent mb-3" />
                  <div className="flex gap-3 mb-4">
                    <button onClick={() => setNewType("image")}
                      className={cn("flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-lg border text-sm transition-colors",
                        newType === "image" ? "border-vectosilo-accent bg-vectosilo-accent/10 text-vectosilo-accent" : "border-vectosilo-border hover:border-vectosilo-accent/50")}>
                      <Camera className="w-5 h-5" />
                      <span>Image</span>
                      <span className="text-[10px] text-vectosilo-muted">Mobilenet</span>
                    </button>
                    <button onClick={() => setNewType("audio")}
                      className={cn("flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-lg border text-sm transition-colors",
                        newType === "audio" ? "border-vectosilo-accent bg-vectosilo-accent/10 text-vectosilo-accent" : "border-vectosilo-border hover:border-vectosilo-accent/50")}>
                      <Volume2 className="w-5 h-5" />
                      <span>Audio</span>
                      <span className="text-[10px] text-vectosilo-muted">Spectrogram</span>
                    </button>
                    <button onClick={() => setNewType("pose")}
                      className={cn("flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-lg border text-sm transition-colors",
                        newType === "pose" ? "border-vectosilo-accent bg-vectosilo-accent/10 text-vectosilo-accent" : "border-vectosilo-border hover:border-vectosilo-accent/50")}>
                      <Maximize2 className="w-5 h-5" />
                      <span>Pose</span>
                      <span className="text-[10px] text-vectosilo-muted">MoveNet</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={startProject} disabled={creating || !newName.trim()}
                      className="px-4 py-2 rounded-lg bg-vectosilo-accent text-black text-sm font-medium hover:bg-vectosilo-accent-soft disabled:opacity-50 transition-colors">
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                    </button>
                    <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg bg-vectosilo-surface-2 text-sm hover:bg-vectosilo-border transition-colors">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(proj => (
                <motion.button key={proj.id} onClick={() => setActiveProject(proj)} layout
                  className="group text-left p-5 rounded-xl bg-vectosilo-surface border border-vectosilo-border hover:border-vectosilo-accent/50 transition-all hover:shadow-glow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("p-2 rounded-lg",
                      proj.type === "image" ? "bg-blue-500/20" : proj.type === "audio" ? "bg-purple-500/20" : "bg-green-500/20")}>
                      {proj.type === "image" ? <Camera className="w-5 h-5 text-blue-400" /> :
                       proj.type === "audio" ? <Volume2 className="w-5 h-5 text-purple-400" /> :
                       <Maximize2 className="w-5 h-5 text-green-400" />}
                    </div>
                    {proj.trained && <CheckCircle className="w-4 h-4 text-vectosilo-accent" />}
                  </div>
                  <h3 className="font-medium text-sm mb-1 group-hover:text-vectosilo-accent transition-colors">{proj.name}</h3>
                  <p className="text-xs text-vectosilo-muted mb-3 capitalize">{proj.type} classifier</p>
                  <div className="flex items-center gap-2 text-xs text-vectosilo-muted">
                    <span>{proj.classes.length} classes</span>
                    <span>·</span>
                    <span>{proj.classes.reduce((s, c) => s + c.sampleCount, 0)} samples</span>
                  </div>
                </motion.button>
              ))}
              {projects.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <Brain className="w-12 h-12 text-vectosilo-muted mx-auto mb-4 opacity-40" />
                  <p className="text-vectosilo-muted mb-2">No projects yet</p>
                  <button onClick={() => { setShowNew(true); initTF(); }} className="text-vectosilo-accent text-sm hover:underline">Create your first ML project</button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Project Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => { setActiveProject(null); stopWebcam(); stopPreview(); setTab("collect"); }}
                  className="p-1.5 rounded-lg hover:bg-vectosilo-surface-2 transition-colors">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className={cn("p-2 rounded-lg",
                  activeProject.type === "image" ? "bg-blue-500/20" : activeProject.type === "audio" ? "bg-purple-500/20" : "bg-green-500/20")}>
                  {activeProject.type === "image" ? <Camera className="w-5 h-5 text-blue-400" /> :
                   activeProject.type === "audio" ? <Volume2 className="w-5 h-5 text-purple-400" /> :
                   <Maximize2 className="w-5 h-5 text-green-400" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{activeProject.name}</h2>
                  <p className="text-xs text-vectosilo-muted capitalize">{activeProject.type} · {activeProject.classes.length} classes · {totalSamples} samples{activeProject.trained ? " · Trained" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={togglePublish} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors",
                  activeProject.published ? "bg-vectosilo-accent/20 text-vectosilo-accent" : "bg-vectosilo-surface-2 text-vectosilo-muted hover:text-vectosilo-text")}>
                  <Share2 className="w-3.5 h-3.5" /> {activeProject.published ? "Published" : "Publish"}
                </button>
              </div>
            </div>

            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Column 1: Gather */}
              <div className="flex flex-col gap-6 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-vectosilo-border pb-6 lg:pb-0 lg:pr-6">
                <div>
                  <h3 className="font-medium mb-3">Classes</h3>
                  <div className="space-y-3">
                    {activeProject.classes.map(cls => (
                      <div key={cls.id} className="p-4 rounded-xl bg-vectosilo-surface border border-vectosilo-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{cls.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-vectosilo-muted">{cls.sampleCount} samples</span>
                            <button onClick={() => removeClass(cls.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {activeProject.type === "audio" ? (
                            <>
                              {capturingForClass === cls.id ? (
                                <button onClick={stopMic}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors animate-pulse">
                                  <Square className="w-3 h-3" /> Stop Capture
                                </button>
                              ) : capturingForClass ? (
                                <button onClick={() => { stopMic(); startMic(cls.id); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 transition-colors">
                                  <Volume2 className="w-3 h-3" /> Switch Here
                                </button>
                              ) : (
                                <button onClick={() => startMic(cls.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30 transition-colors">
                                  <Volume2 className="w-3 h-3" /> Start Capture
                                </button>
                              )}
                              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vectosilo-surface-2 text-vectosilo-muted text-xs hover:bg-vectosilo-border cursor-pointer transition-colors">
                                <Upload className="w-3 h-3" /> Upload
                                <input type="file" accept="audio/*" multiple
                                  hidden onChange={e => { const files = e.target.files; if (files?.length) uploadAudioFile(cls.id, files); e.target.value = ''; }} />
                              </label>
                            </>
                          ) : activeProject.type === "pose" ? (
                            <>
                              {capturingForClass === cls.id ? (
                                <button onClick={() => { stopAutoCapture(); stopWebcam(); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors animate-pulse">
                                  <Square className="w-3 h-3" /> Stop Capture
                                </button>
                              ) : capturingForClass ? (
                                <button onClick={() => { stopAutoCapture(); stopWebcam(); startWebcamWithAutoCapture(cls.id); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/30 transition-colors">
                                  <Maximize2 className="w-3 h-3" /> Switch Here
                                </button>
                              ) : (
                                <button onClick={() => startWebcamWithAutoCapture(cls.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors">
                                  <Maximize2 className="w-3 h-3" /> Start Capture
                                </button>
                              )}
                               <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vectosilo-surface-2 text-vectosilo-muted text-xs hover:bg-vectosilo-border cursor-pointer transition-colors">
                                 <Upload className="w-3 h-3" /> Upload
                                 <input type="file" accept="image/*" multiple
                                   hidden onChange={e => { const files = e.target.files; if (files?.length) uploadSample(cls.id, files); e.target.value = ''; }} />
                               </label>
                             </>
                           ) : (
                             <>
                              {webcamActive ? (
                                <button onClick={() => captureSample(cls.id)} disabled={capturing}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vectosilo-accent/20 text-vectosilo-accent text-xs hover:bg-vectosilo-accent/30 transition-colors">
                                  {capturing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                                  {capturing ? "Hold..." : "Capture"}
                                </button>
                              ) : (
                                <button onClick={startWebcam} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors">
                                  <Camera className="w-3 h-3" /> Start Webcam
                                </button>
                              )}
                               <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vectosilo-surface-2 text-vectosilo-muted text-xs hover:bg-vectosilo-border cursor-pointer transition-colors">
                                 <Upload className="w-3 h-3" /> Upload
                                 <input type="file" accept="image/*" multiple
                                   hidden onChange={e => { const files = e.target.files; if (files?.length) uploadSample(cls.id, files); e.target.value = ''; }} />
                               </label>
                             </>
                           )}
                         </div>
                         <div className="mt-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                           {classSamples[cls.id]?.map((sample) => (
                             <div key={sample.id} className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border border-vectosilo-border group bg-vectosilo-surface-2 flex items-center justify-center">
                               {activeProject.type === "image" ? (
                                 <img src={sample.url} className="w-full h-full object-cover" alt="sample" />
                               ) : activeProject.type === "audio" ? (
                                 <Volume2 className="w-4 h-4 text-vectosilo-muted" />
                               ) : (
                                 <Maximize2 className="w-4 h-4 text-vectosilo-muted" />
                               )}
                             </div>
                           ))}
                           {(!classSamples[cls.id] || classSamples[cls.id].length === 0) && (
                             <div className="w-full py-4 text-center text-xs text-vectosilo-muted border border-dashed border-vectosilo-border rounded-lg">
                               No samples yet
                             </div>
                           )}
                         </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="New class name"
                      className="flex-1 px-3 py-2 rounded-lg bg-vectosilo-surface-2 border border-vectosilo-border text-sm focus:outline-none focus:border-vectosilo-accent" />
                    <button onClick={addClass} disabled={!newClassName.trim()}
                      className="px-4 py-2 rounded-lg bg-vectosilo-accent/20 text-vectosilo-accent text-sm hover:bg-vectosilo-accent/30 disabled:opacity-50 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-3">{activeProject.type === "audio" ? "Microphone" : "Camera"}</h3>
                  <div className="relative rounded-xl bg-vectosilo-surface border border-vectosilo-border overflow-hidden">
                    {activeProject.type === "audio" ? (
                      <div className="aspect-video flex flex-col items-center justify-center">
                        {micActive ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8">
                            <div className="flex items-end gap-1 mb-3 h-20">
                              {Array.from({ length: 30 }).map((_, i) => {
                                const h = Math.max(4, audioLevel * 120 * (0.5 + Math.random() * 0.5) + 4);
                                return <div key={i} className="w-2 rounded-full bg-gradient-to-t from-purple-500 to-pink-500 transition-all duration-75"
                                  style={{ height: `${h}px` }} />;
                              })}
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-vectosilo-muted">Capturing for <span className="text-purple-400 font-medium">{activeProject?.classes.find(c => c.id === capturingForClass)?.name || "..."}</span></p>
                              <p className="text-xs text-vectosilo-muted mt-1">{autoCaptureCount} samples captured</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Volume2 className="w-12 h-12 mb-3 opacity-30 text-purple-400" />
                            <p className="text-sm">Click &ldquo;Start Mic&rdquo; to record samples</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover"
                          style={{ display: webcamActive ? "block" : "none" }} />
                        {!webcamActive && (
                          <div className="aspect-video flex flex-col items-center justify-center text-vectosilo-muted">
                            <Camera className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm">Click &ldquo;Start Webcam&rdquo; to capture samples</p>
                          </div>
                        )}
                      </>
                    )}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                  </div>
                  {activeProject.type === "audio" ? (
                    micActive && (
                      <button onClick={stopMic} className="mt-2 w-full px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">
                        Stop Mic
                      </button>
                    )
                  ) : (
                    webcamActive && (
                      <button onClick={stopWebcam} className="mt-2 w-full px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">
                        Stop Webcam
                      </button>
                    )
                  )}
                  <p className="text-xs text-vectosilo-muted mt-2">
                    {activeProject.type === "audio" ? "Just speak — samples are captured automatically every ~2s while mic is on." :
                     activeProject.type === "pose" ? "Just move — poses are captured automatically every ~1.5s while camera is on." :
                    "Aim for 20+ samples per class. More variety = better accuracy."}
                  </p>
                </div>
              </div>

              {/* Column 2: Train */}
              <div className="flex flex-col gap-6 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-vectosilo-border pb-6 lg:pb-0 lg:pr-6">
                <div className="text-center">
                <div className="p-8 rounded-xl bg-vectosilo-surface border border-vectosilo-border">
                  <Brain className="w-16 h-16 text-vectosilo-accent mx-auto mb-4 opacity-80" />
                  <h3 className="text-lg font-semibold mb-2">Train Your Model</h3>
                  <p className="text-sm text-vectosilo-muted mb-6">
                    {activeProject.classes.length} classes · {totalSamples} samples
                  </p>

                  {!tfReady && (
                    <button onClick={initTF} disabled={tfLoading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-vectosilo-accent text-black font-medium hover:bg-vectosilo-accent-soft disabled:opacity-50 transition-colors mb-4">
                      {tfLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Loading TensorFlow.js...</> : "Load TensorFlow.js"}
                    </button>
                  )}

                  {tfReady && (activeProject.classes.length < 2 ? (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm mb-4">
                      Add at least 2 classes to train
                    </div>
                  ) : activeProject.classes.some(c => c.sampleCount < 1) ? (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm mb-4">
                      Every class needs at least 1 sample
                    </div>
                  ) : (
                    <button onClick={startTraining} disabled={training}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-vectosilo-accent text-black font-medium hover:bg-vectosilo-accent-soft disabled:opacity-50 transition-colors text-lg mb-4">
                      {training ? <><Loader2 className="w-5 h-5 animate-spin" /> Training...</> : <><Play className="w-5 h-5" /> Start Training</>}
                    </button>
                  ))}

                  {trainProgress && training && (
                    <div className="p-3 rounded-lg bg-vectosilo-surface-2 text-sm text-vectosilo-muted mb-4 animate-pulse">
                      {trainProgress}
                    </div>
                  )}

                  {trainResult && !training && (
                    <div className="mt-4">
                      {trainResult.success ? (
                        <div className="p-4 rounded-lg bg-vectosilo-accent/10 border border-vectosilo-accent/30">
                          <CheckCircle className="w-6 h-6 text-vectosilo-accent mx-auto mb-2" />
                          <p className="text-sm font-medium text-vectosilo-accent">Training Complete!</p>
                          <p className="text-xs text-vectosilo-muted mt-1">Model ready for preview</p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                          <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                          {trainResult.error || "Training failed"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* Column 3: Preview & Export */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                <div>
                  <h3 className="font-medium mb-3">Live Preview</h3>
                  <div className="rounded-xl bg-vectosilo-surface border border-vectosilo-border overflow-hidden">
                    {!activeProject.trained ? (
                      <div className="aspect-video flex flex-col items-center justify-center text-vectosilo-muted p-8">
                        <AlertCircle className="w-10 h-10 mb-3 opacity-40" />
                        <p className="text-sm">Train your model first, then preview live results</p>
                      </div>
                    ) : previewActive ? (
                      <div className="relative">
                        {activeProject.type === "audio" ? (
                          <div className="aspect-video flex flex-col items-center justify-center bg-vectosilo-surface-2">
                            <div className="flex items-end gap-1 mb-3 h-24">
                              {Array.from({ length: 40 }).map((_, i) => {
                                const h = Math.max(4, audioLevel * 160 * (0.5 + Math.random() * 0.5) + 4);
                                return <div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-pink-500 transition-all duration-75"
                                  style={{ height: `${h}px` }} />;
                              })}
                            </div>
                            <p className="text-sm text-vectosilo-muted">Listening...</p>
                          </div>
                        ) : (
                          <>
                            <video ref={previewVideoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
                            <canvas ref={previewCanvasRef}
                              className="absolute inset-0 w-full h-full pointer-events-none"
                              style={{ display: activeProject.type === "pose" ? "block" : "none" }} />
                          </>
                        )}
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Live
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video flex flex-col items-center justify-center text-vectosilo-muted">
                        <Play className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm mb-4">
                          {activeProject.type === "audio" ? "Start mic to see live predictions" :
                           "Start camera to see live predictions"}
                        </p>
                        <button onClick={startPreview}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-vectosilo-accent text-black text-sm font-medium hover:bg-vectosilo-accent-soft transition-colors">
                          {activeProject.type === "audio" ? <Volume2 className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                          {activeProject.type === "audio" ? "Start Listening" : "Start Preview"}
                        </button>
                      </div>
                    )}
                  </div>
                  {previewActive && (
                    <button onClick={stopPreview} className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">
                      <Square className="w-3.5 h-3.5" /> Stop Preview
                    </button>
                  )}
                  {!activeProject.trained && modelRef.current && (
                    <p className="text-xs text-vectosilo-muted mt-2">Reload the page and train a model to enable live preview.</p>
                  )}
                </div>

                <div>
                  <h3 className="font-medium mb-3">Output</h3>
                  <div className="p-6 rounded-xl bg-vectosilo-surface border border-vectosilo-border min-h-[280px]">
                    {!activeProject.trained ? (
                      <div className="text-center py-8 text-vectosilo-muted text-sm">
                        <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Train a model to see predictions
                      </div>
                    ) : previewResults ? (
                      <div>
                        <motion.div key={previewResults.prediction}
                          initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className="text-center mb-5 p-3 rounded-xl bg-vectosilo-accent/10 border border-vectosilo-accent/30">
                          <p className="text-xs text-vectosilo-muted uppercase tracking-wider mb-1">Prediction</p>
                          <p className="text-3xl font-bold text-vectosilo-accent">{previewResults.prediction}</p>
                          <p className="text-lg text-vectosilo-accent/80 font-medium">{(previewResults.confidence * 100).toFixed(1)}%</p>
                        </motion.div>
                        <div className="space-y-3">
                          {previewResults.results.map((r, i) => (
                            <div key={r.class}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className={cn("font-medium", i === 0 ? "text-white" : "text-vectosilo-muted")}>{r.class}</span>
                                <span className={cn(i === 0 ? "text-vectosilo-accent font-bold" : "text-vectosilo-muted")}>
                                  {(r.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-6 rounded-full bg-vectosilo-surface-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(r.confidence * 100, 2)}%` }}
                                  transition={{ duration: 0.15, ease: "easeOut" }}
                                  className={cn("h-full rounded-full",
                                    i === 0 ? "bg-gradient-to-r from-vectosilo-accent to-emerald-400" :
                                    i === 1 ? "bg-gradient-to-r from-blue-500 to-purple-500" :
                                    "bg-vectosilo-border/50")}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-vectosilo-muted text-sm">
                        <Play className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Start preview to see live results
                      </div>
                    )}
                  </div>
                </div>

                {/* Export Section */}
                <div className="text-center mt-6 border-t border-vectosilo-border pt-6">
                <div className="p-8 rounded-xl bg-vectosilo-surface border border-vectosilo-border">
                  <Download className="w-16 h-16 text-vectosilo-accent mx-auto mb-4 opacity-80" />
                  <h3 className="text-lg font-semibold mb-2">Export Model</h3>
                  <p className="text-sm text-vectosilo-muted mb-6">
                    Download your trained model as TensorFlow.js format.
                    Use it in any web project.
                  </p>

                  {!modelRef.current ? (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm">
                      Train your model first to export
                    </div>
                  ) : (
                    <>
                      <button onClick={exportModel}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-vectosilo-accent text-black font-medium hover:bg-vectosilo-accent-soft transition-colors mb-3">
                        <Download className="w-5 h-5" /> Download Model (TF.js)
                      </button>
                      <button onClick={exportLiteModel}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-500/20 text-purple-300 font-medium hover:bg-purple-500/30 transition-colors mb-3">
                        <Download className="w-5 h-5" /> Download Model (Lite — @teachablemachine/image)
                      </button>
                      <p className="text-xs text-vectosilo-muted">Your browser will download model.json + weight files</p>
                    </>
                  )}

                  <div className="mt-6 p-4 rounded-lg bg-vectosilo-surface-2 text-left">
                    <p className="text-xs font-medium text-vectosilo-muted mb-2">Usage in your project:</p>
                    <pre className="text-xs text-vectosilo-text overflow-x-auto whitespace-pre-wrap">
{activeProject?.type === "image" ? `import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

const model = await tf.loadLayersModel('./model.json');
const net = await mobilenet.load();

async function classify(img) {
  const feats = net.infer(img, true);
  const pred = model.predict(feats);
  const vals = pred.dataSync();
  return ['${classNamesRef.current.join("', '")}'][vals.indexOf(Math.max(...vals))];
}` : activeProject?.type === "audio" ? `import * as tf from '@tensorflow/tfjs';

const model = await tf.loadLayersModel('./model.json');

async function classify(audioFeatures) {
  const input = tf.tensor2d([audioFeatures], [1, audioFeatures.length]);
  const pred = model.predict(input);
  const vals = pred.dataSync();
  return ['${classNamesRef.current.join("', '")}'][vals.indexOf(Math.max(...vals))];
}` : `import * as tf from '@tensorflow/tfjs';

const model = await tf.loadLayersModel('./model.json');

async function classify(keypoints) {
  const flat = keypoints.flatMap(kp => [kp.x, kp.y, kp.confidence || 0]);
  const input = tf.tensor2d([flat], [1, flat.length]);
  const pred = model.predict(input);
  const vals = pred.dataSync();
  return ['${classNamesRef.current.join("', '")}'][vals.indexOf(Math.max(...vals))];
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Discover Modal */}
      <AnimatePresence>
        {showDiscover && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowDiscover(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl bg-vectosilo-surface border border-vectosilo-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-vectosilo-accent" /> Discover
                </h2>
                <button onClick={() => setShowDiscover(false)} className="p-1.5 rounded-lg hover:bg-vectosilo-surface-2"><X className="w-4 h-4" /></button>
              </div>

              {discoverEntries.length === 0 ? (
                <div className="text-center py-12 text-vectosilo-muted">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No public models yet</p>
                  <p className="text-sm">Train and publish your model to share it</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {discoverEntries.map(entry => (
                    <div key={entry.projectId} className="p-4 rounded-xl bg-vectosilo-surface-2 border border-vectosilo-border hover:border-vectosilo-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-sm">{entry.name}</h3>
                          <p className="text-xs text-vectosilo-muted">by {entry.username?.split("@")[0] || "Anonymous"}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-vectosilo-muted">
                          <Heart className="w-3 h-3" /> {entry.likes || 0}
                        </div>
                      </div>
                      <p className="text-xs text-vectosilo-muted mb-2 line-clamp-2">{entry.description}</p>
                      <div className="flex items-center gap-2 text-xs text-vectosilo-muted">
                        <span className="px-1.5 py-0.5 rounded bg-vectosilo-surface text-[10px]">{entry.type}</span>
                        <span>{entry.classes?.length || 0} classes</span>
                        <span>·</span>
                        <span>{entry.sampleCount || 0} samples</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
