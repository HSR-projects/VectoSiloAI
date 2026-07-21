import type { Plan } from "@/types";

export interface PlanDef {
  id: Plan;
  name: string;
  /** Display price, e.g. "$0" or "$20". */
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

/** Marketing/pricing definitions shown on the upgrade screen. */
export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Search-augmented chat and full-strength chess.",
    cta: "Current plan",
    features: [
      "Auto model (1 model, auto-selected)",
      "Auto web search when needed",
      "Streaming cited answers",
      "Full-strength chess (skill 20)",
      "Interactive artifacts & code preview",
      "PowerPoint slides (up to 20 per deck)",
    ],
  },
  {
    id: "go",
    name: "Go",
    price: "$10",
    period: "/month",
    tagline: "Lightweight productivity — agents, model choice & VectoSilo's Computer.",
    cta: "Get Go",
    highlight: true,
    features: [
      "Everything in Free",
      "All models — choose any VectoSiloAI model",
      "Autonomous task agent (multi-step research)",
      "Up to 4 agent steps per task",
      "VectoSilo's Computer — build, preview & download live apps",
      "PowerPoint slides — up to 70 per deck",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$200",
    period: "/month",
    tagline: "Autonomous research agents and a tougher board.",
    cta: "Upgrade to Pro",
    highlight: true,
    features: [
      "Everything in Free",
      "All models — choose any VectoSiloAI model",
      "Autonomous task agent (multi-step research)",
      "Up to 4 agent steps per task",
      "Agent Swarm — 3 parallel AI specialists",
      "AI image generation (text-to-image)",
      "VectoSilo's Computer — build, preview & download live apps",
      "PowerPoint slides — up to 70 per deck",
      "Priority answer streaming",
    ],
  },
  {
    id: "max",
    name: "Max",
    price: "$600",
    period: "/month",
    tagline: "Maximum depth — for power research and full-strength play.",
    cta: "Upgrade to Max",
    features: [
      "Everything in Pro",
      "All models — maximum context windows",
      "Deep agent runs — up to 8 steps",
      "Agent Swarm — 4 parallel specialists",
      "Early access to new agents",
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$1,000",
    period: "/month",
    tagline: "Enterprise-grade org — manage teams, share chats, gift seats.",
    cta: "Go Ultra",
    features: [
      "Everything in Max",
      "Unlimited agent steps",
      "Agent Swarm — 8 parallel specialists",
      "Organization workspace — manage your team",
      "Employee access requests & admin approval",
      "Gift Pro/Max subscriptions to team members",
      "Public shareable conversation links",
      "Priority support & dedicated account manager",
    ],
  },
];

/** Capability gates derived from the active plan. */
export interface PlanCaps {
  agent: boolean;
  agentSteps: number;
  chessMax: number;
  allModels: boolean;
  swarm: boolean;
  swarmAgents: number;
  imageGen: boolean;
  computer: boolean;
  slidesMax: number;
  desktop: boolean;
  teachProjects: number;
}

export const CAPS: Record<Plan, PlanCaps> = {
  free:  { agent: false, agentSteps: 0,  chessMax: 10, allModels: false, swarm: false, swarmAgents: 0, imageGen: false, computer: false, slidesMax: 20, desktop: false, teachProjects: 5 },
  go:    { agent: true,  agentSteps: 4,  chessMax: 10, allModels: true,  swarm: false, swarmAgents: 0, imageGen: false, computer: true,  slidesMax: 70, desktop: false, teachProjects: 99 },
  pro:   { agent: true,  agentSteps: 4,  chessMax: 10, allModels: true,  swarm: true,  swarmAgents: 3, imageGen: true,  computer: true,  slidesMax: 70, desktop: false, teachProjects: 99 },
  max:   { agent: true,  agentSteps: 8,  chessMax: 10, allModels: true,  swarm: true,  swarmAgents: 4, imageGen: true,  computer: true,  slidesMax: 70, desktop: false, teachProjects: 99 },
  ultra: { agent: true,  agentSteps: 99, chessMax: 10, allModels: true,  swarm: true,  swarmAgents: 8, imageGen: true,  computer: true,  slidesMax: 70, desktop: true,  teachProjects: 999 },
};

export function planDef(id: Plan): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

const GO_CUTOFF = new Date("2026-08-01T00:00:00Z");

export function effectivePlan(plan: Plan): Plan {
  if (plan === "go" && Date.now() >= GO_CUTOFF.getTime()) return "free";
  return plan;
}

export function effectiveCaps(plan: Plan): PlanCaps {
  return CAPS[effectivePlan(plan)];
}
