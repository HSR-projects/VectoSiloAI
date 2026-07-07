export interface SlideTemplate {
  id: string;
  name: string;
  category: "Professional" | "Creative" | "Minimal" | "Dark";
  bg: string;
  title: string;
  text: string;
  accent: string;
  previewBg: string;
  font: string;
  bgGradient?: { colors: string[]; angle: number };
  decorationColor?: string;
}

export const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    id: "midnight",
    name: "Midnight",
    category: "Dark",
    bg: "0B0B0D",
    title: "FFFFFF",
    text: "D6D6DB",
    accent: "5EE6C5",
    previewBg: "linear-gradient(135deg,#1a1a2e,#0b0b0d)",
    font: "Inter",
    bgGradient: { colors: ["0B0B0D", "1a1a2e"], angle: 135 },
    decorationColor: "5EE6C5",
  },
  {
    id: "minimal",
    name: "Minimal",
    category: "Minimal",
    bg: "FFFFFF",
    title: "111114",
    text: "33333A",
    accent: "2563EB",
    previewBg: "#ffffff",
    font: "Arial",
  },
  {
    id: "ocean",
    name: "Ocean",
    category: "Professional",
    bg: "06283D",
    title: "FFFFFF",
    text: "D8ECF3",
    accent: "47B5FF",
    previewBg: "linear-gradient(135deg,#0a3a52,#06283d)",
    font: "Inter",
    bgGradient: { colors: ["06283D", "0a3a52"], angle: 135 },
    decorationColor: "47B5FF",
  },
  {
    id: "sunset",
    name: "Sunset",
    category: "Creative",
    bg: "2A1726",
    title: "FFF3EC",
    text: "F3D9D2",
    accent: "FF7E5F",
    previewBg: "linear-gradient(135deg,#3a1f33,#2a1726)",
    font: "Inter",
    bgGradient: { colors: ["2A1726", "3a1f33"], angle: 135 },
    decorationColor: "FF7E5F",
  },
  {
    id: "forest",
    name: "Forest",
    category: "Creative",
    bg: "0F1F15",
    title: "FFFFFF",
    text: "D7E8DC",
    accent: "7BE08A",
    previewBg: "linear-gradient(135deg,#143324,#0f1f15)",
    font: "Inter",
    bgGradient: { colors: ["0F1F15", "143324"], angle: 135 },
    decorationColor: "7BE08A",
  },
  {
    id: "mono",
    name: "Mono",
    category: "Minimal",
    bg: "000000",
    title: "FFFFFF",
    text: "BFBFBF",
    accent: "FFFFFF",
    previewBg: "#000000",
    font: "Arial",
  },
  {
    id: "aurora",
    name: "Aurora",
    category: "Creative",
    bg: "0D1117",
    title: "FFFFFF",
    text: "C9D1D9",
    accent: "58A6FF",
    previewBg: "linear-gradient(135deg,#0d1117,#161b22,#0d1117)",
    font: "Inter",
    bgGradient: { colors: ["0D1117", "161B22"], angle: 135 },
    decorationColor: "58A6FF",
  },
  {
    id: "coral",
    name: "Coral",
    category: "Creative",
    bg: "1A0F0F",
    title: "FFF5F0",
    text: "F5D6D0",
    accent: "FF6B6B",
    previewBg: "linear-gradient(135deg,#2a1515,#1a0f0f)",
    font: "Inter",
    bgGradient: { colors: ["1A0F0F", "2A1515"], angle: 135 },
    decorationColor: "FF6B6B",
  },
  {
    id: "slate",
    name: "Slate",
    category: "Professional",
    bg: "1E293B",
    title: "F8FAFC",
    text: "CBD5E1",
    accent: "38BDF8",
    previewBg: "linear-gradient(135deg,#1e293b,#0f172a)",
    font: "Inter",
    bgGradient: { colors: ["1E293B", "0F172A"], angle: 135 },
    decorationColor: "38BDF8",
  },
  {
    id: "warmth",
    name: "Warmth",
    category: "Professional",
    bg: "FEF3C7",
    title: "1C1917",
    text: "44403C",
    accent: "D97706",
    previewBg: "linear-gradient(135deg,#fef3c7,#fffbeb)",
    font: "Georgia",
    bgGradient: { colors: ["FEF3C7", "FFFBEB"], angle: 135 },
    decorationColor: "D97706",
  },
  {
    id: "nordic",
    name: "Nordic",
    category: "Professional",
    bg: "ECEFF4",
    title: "2E3440",
    text: "434C5E",
    accent: "5E81AC",
    previewBg: "linear-gradient(135deg,#e5e9f0,#d8dee9)",
    font: "Inter",
    bgGradient: { colors: ["ECEFF4", "D8DEE9"], angle: 135 },
    decorationColor: "5E81AC",
  },
  {
    id: "violet",
    name: "Violet",
    category: "Creative",
    bg: "1F1135",
    title: "F5F3FF",
    text: "DDD6FE",
    accent: "A78BFA",
    previewBg: "linear-gradient(135deg,#2d1b4e,#1f1135)",
    font: "Inter",
    bgGradient: { colors: ["1F1135", "2D1B4E"], angle: 135 },
    decorationColor: "A78BFA",
  },
];

export const DEFAULT_TEMPLATE_ID = "midnight";

export function getTemplate(id: string | undefined): SlideTemplate {
  return SLIDE_TEMPLATES.find((t) => t.id === id) ?? SLIDE_TEMPLATES[0];
}

export function hex(c: string): string {
  return c.startsWith("#") ? c : `#${c}`;
}
