import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'bizassist-api' });
});

// 1. Real-time AI Ticket Diagnosis
app.post('/api/ai/diagnose', async (req, res) => {
  try {
    const { title, description, category, severity } = req.body as {
      title?: string;
      description?: string;
      category?: string;
      severity?: string;
    };

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required for AI diagnosis.' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this enterprise support incident and provide an engineering triage diagnosis:
Category: ${category || 'API Integration'}
Severity: ${severity || 'Critical P1'}
Title: ${title}
Context: ${description}`,
      config: {
        systemInstruction:
          'You are BizAssist AI Copilot, an enterprise SRE & customer support triage engine. Provide concise, realistic technical root cause predictions and runbook mappings.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidence: { type: Type.INTEGER, description: 'Confidence percentage from 75 to 99.' },
            predictedRootCause: { type: Type.STRING, description: 'Concise 1-sentence technical root cause.' },
            recommendedRunbook: { type: Type.STRING, description: 'Runbook code and short title, e.g. Runbook RB-402: Webhook Latency Guide.' },
            routingDestination: { type: Type.STRING, description: 'Queue name, e.g. Tier-2 Esc. Infrastructure Queue.' },
            estimatedResolution: { type: Type.STRING, description: 'Short SLA estimate, e.g. < 15 mins.' },
          },
          required: [
            'confidence',
            'predictedRootCause',
            'recommendedRunbook',
            'routingDestination',
            'estimatedResolution',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err: unknown) {
    console.error('AI diagnose error:', err);
    const message = err instanceof Error ? err.message : 'Failed to run AI diagnosis';
    res.status(500).json({ error: message });
  }
});

// 2. Customer Priority Concierge Query
app.post('/api/ai/concierge', async (req, res) => {
  try {
    const { query, ticketsSummary } = req.body as {
      query?: string;
      ticketsSummary?: string;
    };

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Customer query: ${query}
Active tickets context: ${ticketsSummary || 'All 3 production clusters running nominal.'}`,
      config: {
        systemInstruction:
          'You are BizAssist Priority Concierge for enterprise DevOps customers. Answer concisely in 2-3 clear sentences with actionable next steps or runbook references.',
      },
    });

    res.json({ answer: response.text ?? 'Unable to generate a concierge response.' });
  } catch (err: unknown) {
    console.error('AI concierge error:', err);
    const message = err instanceof Error ? err.message : 'Concierge request failed';
    res.status(500).json({ error: message });
  }
});

// 3. Specialist Draft Reply or Customer-Facing Resolution Summary
app.post('/api/ai/draft-reply', async (req, res) => {
  try {
    const { ticketTitle, ticketDescription, recentMessages, mode } = req.body as {
      ticketTitle?: string;
      ticketDescription?: string;
      recentMessages?: string;
      mode?: 'reply' | 'summary';
    };

    if (!ticketTitle) {
      return res.status(400).json({ error: 'ticketTitle is required.' });
    }

    const ai = getGeminiClient();
    const prompt =
      mode === 'summary'
        ? `Write a clear, reassuring 2-sentence customer-facing post-incident resolution summary for ticket "${ticketTitle}". Context: ${ticketDescription || ''}. Notes: ${recentMessages || ''}`
        : `Draft a crisp, helpful Tier-2 SRE specialist reply to the customer for ticket "${ticketTitle}". Context: ${ticketDescription || ''}. Recent messages: ${recentMessages || 'None'}. Keep it under 60 words and mention concrete diagnostics or verification steps.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a senior Tier-2 Infrastructure Specialist using BizAssist AI. Be clear, direct, and technically accurate.',
      },
    });

    res.json({ draft: (response.text ?? '').trim() });
  } catch (err: unknown) {
    console.error('AI draft-reply error:', err);
    const message = err instanceof Error ? err.message : 'Failed to draft reply';
    res.status(500).json({ error: message });
  }
});

// 4. Admin / Ops 24/7 Co-Pilot Assistant
app.post('/api/ai/copilot', async (req, res) => {
  try {
    const { prompt, context } = req.body as {
      prompt?: string;
      context?: string;
    };

    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Ops Query: ${prompt}\nPlatform Telemetry Context: ${context || ''}`,
      config: {
        systemInstruction:
          'You are BizAssist AI Autotriage Co-Pilot for enterprise operations leads. Respond with structured diagnostics, probable root cause, and an actionable runbook step.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING, description: 'Concise root cause diagnosis.' },
            runbookCode: { type: Type.STRING, description: 'Runbook code like RB-402 or RB-118.' },
            runbookAction: { type: Type.STRING, description: '1-sentence remediation action.' },
            estimatedSeconds: { type: Type.INTEGER, description: 'Estimated execution time in seconds.' },
            recommendedSpecialist: { type: Type.STRING, description: 'Best specialist name, e.g. Sarah Lin.' },
          },
          required: ['rootCause', 'runbookCode', 'runbookAction', 'estimatedSeconds', 'recommendedSpecialist'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err: unknown) {
    console.error('AI copilot error:', err);
    const message = err instanceof Error ? err.message : 'Copilot request failed';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`BizAssist AI server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
