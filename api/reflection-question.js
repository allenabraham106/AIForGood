import { GoogleGenAI } from "@google/genai";

const INSTRUCTION = `You generate a single reflection question for a language-learning scenario.
Rules:
- Exactly one short question.
- Maximum 10 words.
- Beginner-level English only.
- Encouraging and natural when spoken aloud.
- No jargon or complex words.
- Return only the question text, nothing else.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: "Reflection API not configured",
      hint: "Set GEMINI_API_KEY (or GOOGLE_API_KEY) in environment",
    });
    return;
  }

  let promptContext;
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    promptContext = typeof body.promptContext === "string" ? body.promptContext : "";
  } catch (_) {
    res.status(400).json({ error: "Invalid request; send JSON with promptContext" });
    return;
  }

  if (!promptContext.trim()) {
    res.status(400).json({ error: "promptContext is required" });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${INSTRUCTION}\n\nGenerate one reflection question for this scenario:\n\n${promptContext}`,
      config: {
        maxOutputTokens: 60,
      },
    });

    const text =
      typeof response?.text === "string"
        ? response.text
        : response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const question =
      typeof text === "string" ? text.trim().replace(/^["']|["']$/g, "") : "";

    if (!question) {
      res.status(502).json({ error: "No question in response" });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    res.status(200).json({ question });
  } catch (err) {
    console.error("Gemini API error:", err?.message || err);
    res.status(502).json({
      error: "Failed to generate reflection question",
      detail: err?.message || "Unknown error",
    });
  }
}
