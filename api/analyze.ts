import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SensorData {
  device_id: string;
  location: string;
  methane: number;
  temperature: number;
  humidity: number;
  timestamp: number;
}

interface Alert {
  id: string;
  sensorId: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: number;
  acknowledged: boolean;
}

interface AnalysisRequest {
  readings: SensorData[];
  alerts: Alert[];
}

const AI_API_KEY = process.env.AI_API || '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';
const AI_MODEL = process.env.AI_MODEL || 'mistralai/devstral-2512:free';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { readings, alerts } = req.body as AnalysisRequest;

    if (!readings || !Array.isArray(readings)) {
      return res.status(400).json({ error: 'Invalid request: readings array required' });
    }

    // Prepare data summary for AI
    const recentReadings = readings.slice(-30);
    const dataSummary = JSON.stringify(recentReadings.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString(),
      location: r.location,
      methane: r.methane,
      temperature: r.temperature,
      humidity: r.humidity
    })));

    const alertSummary = JSON.stringify((alerts || []).filter(a => !a.acknowledged));

    const prompt = `You are SafeWard AI, an expert hospital environmental safety assistant.
      
Here is the recent sensor data from our IoT network (JSON format):
${dataSummary}

Here are active alerts:
${alertSummary}

Please provide a concise safety report.
1. Analyze the trends. Is the environment stable?
2. Identify any potential hazards (infection risks due to temp/humidity, fire risks due to methane).
3. Recommend specific actions for hospital staff.

Keep the tone professional and clinical.`;

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://safeward.vercel.app',
        'X-Title': 'SafeWard IoT Monitor'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are SafeWard AI, an expert hospital environmental safety analyst. Provide professional, clinical, and actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return res.status(500).json({ 
        error: 'AI analysis failed', 
        details: errorText 
      });
    }

    const aiResponse = await response.json();
    const analysis = aiResponse.choices?.[0]?.message?.content || 'No analysis could be generated.';

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
