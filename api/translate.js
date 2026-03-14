import { GoogleGenAI } from "@google/genai";

/** Translate English text to Bengali. Uses same GEMINI_API_KEY as voice/reflection APIs. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Translation API not configured", hint: "Set GEMINI_API_KEY" });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "Missing text", hint: "POST JSON: { \"text\": \"...\" }" });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate this English phrase into Bengali (Bangla). Reply with ONLY a JSON object, no other text:
{"bengali": "the phrase in Bengali script", "pronunciation": "how to say it in Latin letters for English speakers (e.g. apni kemon achen)"}
Use simple Latin spelling for pronunciation so learners can read it aloud. No quotes outside the JSON.\n\nEnglish: "${text}"`,
      config: { maxOutputTokens: 120 },
    });

    let raw = "";
    if (typeof response?.text === "string") raw = response.text;
    else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) raw = response.candidates[0].content.parts[0].text;
    const str = String(raw).trim();
    let translated = "";
    let pronunciation = "";
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        translated = typeof parsed.bengali === "string" ? parsed.bengali.trim() : "";
        pronunciation = typeof parsed.pronunciation === "string" ? parsed.pronunciation.trim() : "";
      } catch (_) {}
    }
    if (!translated) {
      res.status(502).json({ error: "No translation returned" });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json({ translated, pronunciation: pronunciation || undefined });
  } catch (err) {
    console.error("Translate API error:", err?.message || err);
    res.status(502).json({ error: "Translation failed", detail: err?.message || String(err) });
  }
}
