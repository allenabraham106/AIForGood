import { GoogleGenAI } from "@google/genai";

const SYSTEM = `You are a warm English coach for newcomer learners. They just spoke a phrase out loud for practice.
Give one short, encouraging response (1–2 sentences). Rules:
- Maximum 15 words total.
- Beginner English only.
- Encouraging and kind. If they tried, praise the attempt.
- If what they said is close to the target phrase, say they did well.
- No jargon. Natural when spoken aloud.
Return only the response text. No quotes or labels.`;

export default async function handler(req, res) {
  try {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Safe log for debugging in Vercel → Deployments → [deploy] → Functions → Logs
    console.warn(
      "Voice API: no key. GEMINI_API_KEY=" + (process.env.GEMINI_API_KEY ? "set" : "missing") +
      ", GOOGLE_API_KEY=" + (process.env.GOOGLE_API_KEY ? "set" : "missing")
    );
    res.status(503).json({
      error: "Voice response API not configured",
      hint: "In Vercel: Settings → Environment Variables → add GEMINI_API_KEY (exact name), enable Production, then Redeploy",
    });
    return;
  }

  let transcript = "";
  let expectedPhrase = "";
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    expectedPhrase = typeof body.expectedPhrase === "string" ? body.expectedPhrase.trim() : "";
  } catch (_) {
    res.status(400).json({ error: "Invalid request; send JSON with transcript" });
    return;
  }

  const userSaid = transcript || "(no speech heard)";
  const target = expectedPhrase ? ` They were practicing: "${expectedPhrase}."` : "";

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${SYSTEM}\n\nWhat the learner said: "${userSaid}".${target}\n\nYour short response:`,
      config: { maxOutputTokens: 80 },
    });

    // Support both SDK response shapes
    let text = "";
    if (typeof response?.text === "string") {
      text = response.text;
    } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = response.candidates[0].content.parts[0].text;
    } else if (response?.candidates?.[0]?.content?.parts?.[0]) {
      const part = response.candidates[0].content.parts[0];
      text = typeof part.text === "string" ? part.text : "";
    }
    const answer = typeof text === "string" ? text.trim().replace(/^["']|["']$/g, "") : "";

    if (!answer) {
      res.status(502).json({
        error: "No response from model",
        detail: "Gemini returned empty or unexpected shape",
      });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=0, no-store");
    res.status(200).json({ answer });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("Gemini voice-response error:", msg);
    res.status(502).json({
      error: "Could not get response",
      detail: msg,
    });
  }
  } catch (err) {
    console.error("Voice response handler error:", err);
    res.status(500).json({
      error: "Voice API error",
      detail: err?.message || String(err),
    });
  }
}
