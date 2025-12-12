import type { VercelRequest, VercelResponse } from '@vercel/node';

// Access the global storage from receive.ts
declare global {
  var sensorReadings: SensorData[];
}

interface SensorData {
  device_id: string;
  location: string;
  methane: number;
  temperature: number;
  humidity: number;
  timestamp: number;
}

// Initialize if not exists
if (!global.sensorReadings) {
  global.sensorReadings = [];
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Get query parameters for filtering
    const { location, limit = '100', since } = req.query;
    
    let readings = [...global.sensorReadings];
    
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
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
