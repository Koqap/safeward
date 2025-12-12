import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage for sensor readings (in production, use a database)
// This is a simple solution for demo purposes
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

// Initialize global storage if not exists
if (!global.sensorReadings) {
  global.sensorReadings = [];
}

const MAX_READINGS = 500; // Keep last 500 readings

export default function handler(req: VercelRequest, res: VercelResponse) {
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

      // Add to storage
      global.sensorReadings.push(reading);
      
      // Keep only the last MAX_READINGS
      if (global.sensorReadings.length > MAX_READINGS) {
        global.sensorReadings = global.sensorReadings.slice(-MAX_READINGS);
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Data received',
        reading 
      });
    } catch (error) {
      console.error('Error processing sensor data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
