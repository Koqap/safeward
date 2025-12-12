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

// Initialize Redis client (uses Vercel's Upstash integration env vars)
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const READINGS_KEY = 'safeward:readings';
const MAX_READINGS = 500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const data = req.body as SensorData;
      
      // Validate required fields
      if (typeof data.methane !== 'number' || 
          typeof data.temperature !== 'number' || 
          typeof data.humidity !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid data format. Required: methane, temperature, humidity (numbers)' 
        });
      }

      const reading: SensorData = {
        device_id: data.device_id || 'esp32-001',
        location: data.location || 'Ward A',
        methane: data.methane,
        temperature: data.temperature,
        humidity: data.humidity,
        timestamp: data.timestamp || Date.now()
      };

      // Get existing readings from Redis
      let readings: SensorData[] = await redis.get(READINGS_KEY) || [];
      
      // Add new reading
      readings.push(reading);
      
      // Keep only the last MAX_READINGS
      if (readings.length > MAX_READINGS) {
        readings = readings.slice(-MAX_READINGS);
      }

      // Store back to Redis
      await redis.set(READINGS_KEY, readings);

      return res.status(200).json({ 
        success: true, 
        message: 'Data received',
        reading 
      });
    } catch (error) {
      console.error('Error processing sensor data:', error);
      return res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
