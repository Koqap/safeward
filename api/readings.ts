import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

interface SensorData {
  device_id: string;
  location: string;
  methane: number;
  temperature: number;
  humidity: number;
  timestamp: number;
}

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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
      // Get query parameters for filtering
      const { location, limit = '100', since } = req.query;
      
      // Get readings from Redis
      let readings: SensorData[] = await redis.get(READINGS_KEY) || [];
      
      // Filter by location if provided
      if (location && typeof location === 'string') {
        readings = readings.filter(r => r.location === location);
      }
      
      // Filter by timestamp if provided
      if (since && typeof since === 'string') {
        const sinceTime = parseInt(since);
        if (!isNaN(sinceTime)) {
          readings = readings.filter(r => r.timestamp > sinceTime);
        }
      }
      
      // Limit results
      const limitNum = Math.min(parseInt(limit as string) || 100, 500);
      readings = readings.slice(-limitNum);

      return res.status(200).json({
        success: true,
        count: readings.length,
        readings
      });
    } catch (error) {
      console.error('Error fetching readings:', error);
      return res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
