export const modelsData = JSON.stringify({
  vectosiloai: {
    id: "vectosiloai",
    name: "VectoSiloAI",
    env: ["VECTOSILO_API_KEY"],
    npm: "@ai-sdk/openai-compatible",
    api: "https://chat.hsrprojects.org/api/v1",
    models: {
      koder: {
        id: "koder",
        name: "VectoSiloAI Koder",
        release_date: "2026-06-25",
        attachment: true,
        reasoning: true,
        temperature: true,
        tool_call: true,
        cost: { input: 0.01, output: 0.01 },
        limit: { context: 128000, output: 8192 },
        modalities: { input: ["text", "image"], output: ["text"] },
      },
    },
  },
})

console.log("Loaded VectoSiloAI model catalog")
