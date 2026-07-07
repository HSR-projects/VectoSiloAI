export const modelsData = JSON.stringify({
  kodaai: {
    id: "kodaai",
    name: "KodaAI",
    env: ["KODA_API_KEY"],
    npm: "@ai-sdk/openai-compatible",
    api: "https://chat.hsrprojects.org/api/v1",
    models: {
      koder: {
        id: "koder",
        name: "KodaAI Koder",
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

console.log("Loaded KodaAI model catalog")
