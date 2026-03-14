import { GoogleGenAI } from "@google/genai";

const SYSTEM = `Judge if the learner said the target phrase. The text is from speech-to-text (ignore punctuation/caps). Same meaning and key words = correct. Reply with only a JSON object: {"correct": true or false, "message": "short phrase under 6 words"}. Target: women with ~5% English literacy — use only the simplest words. If correct: "Good!" or "Yes!". If incorrect: "Try again." or "Say it again."`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: "Voice response API not configured",
        hint: "Local: add GEMINI_API_KEY=your_key to .env.local and run 'npx vercel dev' (not npm run dev). Production: set GEMINI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
      });
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const transcript = (typeof body.transcript === "string" ? body.transcript.trim() : "") || "(no speech heard)";
    const expectedPhrase = typeof body.expectedPhrase === "string" ? body.expectedPhrase.trim() : "";

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${SYSTEM}\n\nTarget: "${expectedPhrase}"\nThey said: "${transcript}"\nJSON:`,
      config: { maxOutputTokens: 80 },
    });

    let text = "";
    if (typeof response?.text === "string") text = response.text;
    else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) text = response.candidates[0].content.parts[0].text;
    const raw = String(text).trim();
    let correct = false;
    let message = "Incorrect. Try again.";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        correct = parsed.correct === true;
        if (typeof parsed.message === "string" && parsed.message.trim()) message = parsed.message.trim();
      } catch (_) {}
    }

    res.setHeader("Cache-Control", "s-maxage=0, no-store");
    res.status(200).json({ answer: message, correct });
  } catch (err) {
    console.error("Voice response error:", err?.message || err);
    res.status(502).json({
      error: "Could not get response",
      detail: err?.message || String(err),
    });
  }
}
