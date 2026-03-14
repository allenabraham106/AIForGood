import { GoogleGenAI } from "@google/genai";

const SYSTEM = `You are a coach judging whether a learner said the correct phrase. They were practicing a specific phrase.
Respond with ONLY a JSON object, no other text. Two keys:
- "correct": true only if what they said matches or is very close to the target phrase (same meaning, minor wording or pronunciation differences OK). false if wrong phrase, gibberish, or unrelated.
- "message": a short phrase (max 12 words). If correct: encouraging (e.g. "Well done!"). If incorrect: say "Incorrect. Try again." or similar. Beginner English only.`;

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
      contents: `${SYSTEM}\n\nWhat the learner said: "${userSaid}".${target}\n\nRespond with only the JSON object:`,
      config: { maxOutputTokens: 120 },
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
    const raw = typeof text === "string" ? text.trim() : "";
    // Parse JSON (may be wrapped in markdown code block)
    let correct = false;
    let message = "Incorrect. Try again.";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        correct = parsed.correct === true;
        if (typeof parsed.message === "string" && parsed.message.trim()) {
          message = parsed.message.trim();
        }
      } catch (_) {}
    }

    res.setHeader("Cache-Control", "s-maxage=0, no-store");
    res.status(200).json({ answer: message, correct });
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
