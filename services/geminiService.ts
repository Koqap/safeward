import { SensorReading, Alert } from "../types";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiSensorData {
  device_id: string;
  location: string;
  methane: number;
  temperature: number;
  humidity: number;
  timestamp: number;
}

// Convert SensorReading to ApiSensorData format for the API
const convertReadingsToApiFormat = (readings: SensorReading[]): ApiSensorData[] => {
  // Group readings by timestamp and location
  const grouped: Record<string, ApiSensorData> = {};
  
  readings.forEach(reading => {
    const key = `${reading.location}-${reading.timestamp}`;
    if (!grouped[key]) {
      grouped[key] = {
        device_id: `esp32-${reading.location.toLowerCase().replace(' ', '')}`,
        location: reading.location,
        methane: 0,
        temperature: 0,
        humidity: 0,
        timestamp: reading.timestamp
      };
    }
    
    if (reading.type === 'METHANE') grouped[key].methane = reading.value;
    else if (reading.type === 'TEMPERATURE') grouped[key].temperature = reading.value;
    else if (reading.type === 'HUMIDITY') grouped[key].humidity = reading.value;
  });
  
  return Object.values(grouped);
};

export const analyzeEnvironmentalData = async (
  readings: SensorReading[],
  alerts: Alert[]
): Promise<string> => {
  try {
    // Filter to only include recent readings (last 30 seconds) - only analyze active wards
    const now = Date.now();
    const recentThreshold = 30000; // 30 seconds
    const recentReadings = readings.filter(r => (now - r.timestamp) < recentThreshold);
    
    // If no recent readings, return a message
    if (recentReadings.length === 0) {
      return "No recent sensor data available. Please ensure ESP32 devices are actively sending data.";
    }
    
    // Convert readings to API format (use recent readings, up to 50)
    const apiReadings = convertReadingsToApiFormat(recentReadings.slice(-50));
    
    // Call the backend API for AI analysis
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        readings: apiReadings,
        alerts: alerts.filter(a => !a.acknowledged)
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('AI Analysis API error:', error);
      return `Unable to perform AI analysis: ${error.error || 'API error'}`;
    }

    const data = await response.json();
    return data.analysis || "No analysis could be generated.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "An error occurred while communicating with the AI service. Please ensure the API is available.";
  }
};
