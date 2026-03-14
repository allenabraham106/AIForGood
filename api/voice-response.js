import { buildVoiceFeedbackResponse } from './_lib/voice-feedback.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
    const expectedPhrase = typeof body.expectedPhrase === 'string' ? body.expectedPhrase.trim() : '';
    const recognitionConfidence = typeof body.recognitionConfidence === 'number'
      ? body.recognitionConfidence
      : null;

    const response = buildVoiceFeedbackResponse(
      transcript,
      expectedPhrase,
      recognitionConfidence,
    );

    res.setHeader('Cache-Control', 's-maxage=0, no-store');
    res.status(200).json(response);
  } catch (err) {
    console.error('Voice response handler error:', err);
    res.status(500).json({
      error: 'Voice API error',
      detail: err?.message || String(err),
    });
  }
}
