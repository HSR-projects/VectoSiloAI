import { NextResponse } from "next/server";

// @ts-ignore
import JSZip from "jszip";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const projectObj = generateScratchProject(prompt);
    const zip = new JSZip();
    zip.file("project.json", JSON.stringify(projectObj));
    const sb3 = await zip.generateAsync({ type: "nodebuffer" });

    const b64 = sb3.toString("base64");
    return NextResponse.json({ sb3: b64, filename: "vectosiloblocks-project.sb3" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

interface Block {
  opcode: string;
  next: string | null;
  parent: string | null;
  inputs: Record<string, unknown>;
  fields: Record<string, unknown>;
  shadow: boolean;
  topLevel: boolean;
  x?: number;
  y?: number;
}

interface Target {
  isStage: boolean;
  name: string;
  variables: Record<string, unknown>;
  lists: Record<string, unknown>;
  broadcasts: Record<string, unknown>;
  blocks: Record<string, Block>;
  comments: Record<string, unknown>;
  currentCostume: number;
  costumes: { name: string; dataFormat: string; assetId: string; md5ext: string; rotationCenterX: number; rotationCenterY: number }[];
  sounds: { name: string; dataFormat: string; assetId: string; md5ext: string; rate: number; sampleCount: number }[];
  volume: number;
  layerOrder: number;
  tempo: number;
  videoTransparency: number;
  videoState: string;
  textToSpeechLanguage: string | null;
}

interface ScratchProject {
  targets: Target[];
  monitors: unknown[];
  extensions: string[];
  meta: { semver: string; vm: string; agent: string };
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

function makeBlock(opcode: string, fields: Record<string, unknown> = {}, inputs: Record<string, unknown> = {}, x = 30, y = 30): Block {
  return {
    opcode,
    next: null,
    parent: null,
    inputs,
    fields,
    shadow: false,
    topLevel: true,
    x, y,
  };
}

function addBlocks(sprite: Target, blocks: Record<string, Block>, prompt: string): void {
  const whenGreenFlag = uid();
  blocks[whenGreenFlag] = makeBlock("event_whenflagclicked", {}, {}, 30, 30);
  let lastId = whenGreenFlag;
  let yPos = 80;

  const pl = prompt.toLowerCase();

  if (pl.includes("move") || pl.includes("walk") || pl.includes("go")) {
    const steps = pl.match(/(\d+)\s*steps/) ? parseInt(pl.match(/(\d+)\s*steps/)![1]) : 10;
    const id = uid();
    blocks[id] = makeBlock("motion_movesteps", { STEPS: { name: "STEPS", value: steps } }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("turn") || pl.includes("rotate") || pl.includes("spin")) {
    const dir = pl.includes("left") ? "motion_turnleft" : "motion_turnright";
    const deg = pl.match(/\d+\s*degrees?/) ? parseInt(pl.match(/\d+\s*degrees?/)![0]) : 15;
    const id = uid();
    blocks[id] = makeBlock(dir, { DEGREES: { name: "DEGREES", value: deg } }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("glide") || pl.includes("slide")) {
    const x = pl.match(/x[=:]?\s*(-?\d+)/) ? parseInt(pl.match(/x[=:]?\s*(-?\d+)/)![1]) : 100;
    const y = pl.match(/y[=:]?\s*(-?\d+)/) ? parseInt(pl.match(/y[=:]?\s*(-?\d+)/)![1]) : 100;
    const id = uid();
    blocks[id] = makeBlock("motion_glidesecstoxy", {
      SECS: { name: "SECS", value: 1 },
      X: { name: "X", value: x },
      Y: { name: "Y", value: y },
    }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("say") || pl.includes("think") || pl.includes("speak") || pl.includes("talk")) {
    const op = pl.includes("think") ? "looks_think" : "looks_say";
    let msg = "Hello!";
    const match = prompt.match(/[""]([^""]+)[""]/);
    if (match) msg = match[1];
    else if (pl.includes("hello") || pl.includes("hi")) msg = "Hello!";
    else if (pl.includes("name")) msg = "My name is Sprite!";
    else msg = prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt;
    const id = uid();
    blocks[id] = makeBlock(op, { MESSAGE: { name: "MESSAGE", value: msg } }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("sound") || pl.includes("play") || pl.includes("beep") || pl.includes("meow")) {
    const id = uid();
    blocks[id] = makeBlock("sound_play", { SOUND_MENU: { name: "SOUND_MENU", value: "Meow" } }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("repeat") || pl.includes("loop") || pl.includes("times")) {
    const timesMatch = pl.match(/(\d+)\s*times?/);
    const times = timesMatch ? parseInt(timesMatch[1]) : 10;
    const repeatId = uid();
    blocks[repeatId] = makeBlock("control_repeat", { TIMES: { name: "TIMES", value: times } }, { SUBSTACK: {} }, 80, yPos);
    blocks[lastId].next = repeatId;
    blocks[repeatId].parent = lastId;
    lastId = repeatId;
    yPos += 50;

    const insideId = uid();
    blocks[insideId] = makeBlock("motion_movesteps", { STEPS: { name: "STEPS", value: 10 } }, {}, 130, yPos);
    blocks[repeatId].inputs.SUBSTACK = insideId;
    blocks[insideId].parent = repeatId;
  }

  if (pl.includes("change") || pl.includes("size") || pl.includes("grow") || pl.includes("shrink")) {
    const dir = pl.includes("shrink") || pl.includes("small") ? -10 : 10;
    const id = uid();
    blocks[id] = makeBlock("looks_changeeffectby", {
      EFFECT: { name: "EFFECT", value: "color" },
      CHANGE: { name: "CHANGE", value: dir > 0 ? 25 : -25 },
    }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("color") || pl.includes("effect")) {
    const effect = pl.includes("fisheye") ? "fisheye" :
      pl.includes("whirl") ? "whirl" :
      pl.includes("pixel") ? "pixelate" :
      pl.includes("mosaic") ? "mosaic" :
      pl.includes("bright") ? "brightness" :
      pl.includes("ghost") ? "ghost" : "color";
    const id = uid();
    blocks[id] = makeBlock("looks_changeeffectby", {
      EFFECT: { name: "EFFECT", value: effect },
      CHANGE: { name: "CHANGE", value: 25 },
    }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("wait") || pl.includes("delay") || pl.includes("pause")) {
    const secs = pl.match(/\d+\.?\d*\s*seconds?/) ? parseFloat(pl.match(/\d+\.?\d*\s*seconds?/)![0]) : 1;
    const id = uid();
    blocks[id] = makeBlock("control_wait", { DURATION: { name: "DURATION", value: secs } }, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  if (pl.includes("hide") || pl.includes("show") || pl.includes("visible")) {
    const op = pl.includes("hide") ? "looks_hide" : "looks_show";
    const id = uid();
    blocks[id] = makeBlock(op, {}, {}, 30, yPos);
    blocks[lastId].next = id;
    blocks[id].parent = lastId;
    lastId = id;
    yPos += 50;
  }

  // Default: if no blocks matched, add a simple say block
  if (lastId === whenGreenFlag) {
    const id = uid();
    blocks[id] = makeBlock("looks_sayforsecs", {
      MESSAGE: { name: "MESSAGE", value: `Let's build: ${prompt.slice(0, 40)}` },
      SECS: { name: "SECS", value: 2 },
    }, {}, 30, yPos);
    blocks[whenGreenFlag].next = id;
    blocks[id].parent = whenGreenFlag;
  }
}

function generateScratchProject(prompt: string): ScratchProject {
  const project: ScratchProject = {
    targets: [
      {
        isStage: true,
        name: "Stage",
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [{
          name: "backdrop1",
          dataFormat: "svg",
          assetId: "cd21514d0531fdffb22204e0ec5ed84a",
          md5ext: "cd21514d0531fdffb22204e0ec5ed84a.svg",
          rotationCenterX: 240,
          rotationCenterY: 180,
        }],
        sounds: [{
          name: "pop",
          dataFormat: "wav",
          assetId: "83a9787d4cb6f3b7632b4ddfebf74367",
          md5ext: "83a9787d4cb6f3b7632b4ddfebf74367.wav",
          rate: 22050,
          sampleCount: 258,
        }],
        volume: 100,
        layerOrder: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: "on",
        textToSpeechLanguage: null,
      },
      {
        isStage: false,
        name: "Sprite1",
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [{
          name: "costume1",
          dataFormat: "svg",
          assetId: "09dc888b0b7df19f70d81544ae06db20",
          md5ext: "09dc888b0b7df19f70d81544ae06db20.svg",
          rotationCenterX: 48,
          rotationCenterY: 50,
        }],
        sounds: [{
          name: "Meow",
          dataFormat: "wav",
          assetId: "83c36d806dc92327b9e7049a565c6bff",
          md5ext: "83c36d806dc92327b9e7049a565c6bff.wav",
          rate: 22050,
          sampleCount: 258,
        }],
        volume: 100,
        layerOrder: 1,
        tempo: 60,
        videoTransparency: 50,
        videoState: "on",
        textToSpeechLanguage: null,
      },
    ],
    monitors: [],
    extensions: [],
    meta: {
      semver: "3.0.0",
      vm: "0.2.0",
      agent: "VectoSiloAI",
    },
  };

  const sprite = project.targets[1];
  addBlocks(sprite, sprite.blocks, prompt);

  return project;
}
