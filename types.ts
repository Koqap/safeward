export type SensorType = 'METHANE' | 'TEMPERATURE' | 'HUMIDITY';

export interface SensorReading {
  id: string;
  type: SensorType;
  value: number;
  unit: string;
  timestamp: number;
  location: string;
}

export interface SensorConfig {
  id: string;
  type: SensorType;
  label: string;
  unit: string;
  safeRange: [number, number]; // [min, max]
  warningThreshold: number; // Value above/below which triggers warning
  location: string;
}

export interface Alert {
  id: string;
  sensorId: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: number;
  acknowledged: boolean;
}

export type ViewState = 'DASHBOARD' | 'SENSORS' | 'ALERTS' | 'AI_ANALYSIS' | 'ANALYTICS' | 'SETTINGS';