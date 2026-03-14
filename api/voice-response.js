import { GoogleGenAI } from "@google/genai";

const SYSTEM = `You judge if a learner said the TARGET PHRASE. The learner spoke out loud; the text you get is from speech-to-text, so:
- Ignore punctuation, capitalization, and spacing.
- Words may be wrong (e.g. "how r you" for "how are you", "gonna" for "going to"). If the intended phrase is clear, count it as correct.
- Compare MEANING and KEY WORDS to the target. If they said the same phrase (even with small transcript errors), correct = true.
- Only set correct = false when they clearly said a DIFFERENT phrase, wrong language, gibberish, or unrelated words.

Respond with ONLY a JSON object. Two keys:
- "correct": boolean. true = they said the target phrase (or close enough); false = they did not.
- "message": string, max 12 words. If correct: one short encouraging line (e.g. "Well done!", "Good job!"). If incorrect: your own short message telling them to try again (e.g. "Not quite. Try again.", "That wasn't it. Say the phrase again."). Beginner English only.`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
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
    const targetLine = expectedPhrase
      ? `TARGET PHRASE they should say: "${expectedPhrase}"`
      : "TARGET PHRASE: (none given)";

    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${SYSTEM}\n\n${targetLine}\nSpeech-to-text transcript of what they said: "${userSaid}"\n\nJudge by meaning and key words (transcript may lack punctuation or have small errors). Respond with only the JSON object:`,
        config: { maxOutputTokens: 120 },
      });

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
