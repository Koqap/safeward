import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

interface SensorData {
  device_id: string;
  location: string;
  methane: number;
  temperature: number;
  humidity: number;
  timestamp: number;
  error?: string;
}

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const READINGS_KEY = 'safeward:readings';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // Get readings from Redis
      const readings: SensorData[] = await redis.get(READINGS_KEY) || [];
      
      // Convert to XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<readings>\n';
      
      readings.forEach(r => {
        xml += '  <reading>\n';
        xml += `    <device_id>${r.device_id}</device_id>\n`;
        xml += `    <location>${r.location}</location>\n`;
        xml += `    <methane>${r.methane}</methane>\n`;
        xml += `    <temperature>${r.temperature}</temperature>\n`;
        xml += `    <humidity>${r.humidity}</humidity>\n`;
        xml += `    <timestamp>${new Date(r.timestamp).toISOString()}</timestamp>\n`;
        if (r.error) {
          xml += `    <error>${r.error}</error>\n`;
        }
        xml += '  </reading>\n';
      });
      
      xml += '</readings>';

      // Set headers for file download
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="safeward-readings.xml"');
      
      return res.status(200).send(xml);
    } catch (error) {
      console.error('Error exporting readings:', error);
      return res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
