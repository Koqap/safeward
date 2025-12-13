import { SensorConfig } from './types';

export const LOCATIONS = ['Ward A', 'Ward B', 'Ward C'];

export const SENSOR_CONFIGS: SensorConfig[] = [
  // Ward A Sensors
  {
    id: 'wa-temp',
    type: 'TEMPERATURE',
    label: 'Ward A Temp',
    unit: '°C',
    safeRange: [22, 26],
    warningThreshold: 26,
    location: 'Ward A'
  },
  {
    id: 'wa-hum',
    type: 'HUMIDITY',
    label: 'Ward A Humidity',
    unit: '%',
    safeRange: [40, 60],
    warningThreshold: 60,
    location: 'Ward A'
  },
  {
    id: 'wa-meth',
    type: 'METHANE',
    label: 'Ward A Methane',
    unit: 'ppm',
    safeRange: [0, 200],
    warningThreshold: 200,
    location: 'Ward A'
  },

  // Ward B Sensors
  {
    id: 'wb-temp',
    type: 'TEMPERATURE',
    label: 'Ward B Temp',
    unit: '°C',
    safeRange: [22, 26],
    warningThreshold: 26,
    location: 'Ward B'
  },
  {
    id: 'wb-hum',
    type: 'HUMIDITY',
    label: 'Ward B Humidity',
    unit: '%',
    safeRange: [40, 60],
    warningThreshold: 60,
    location: 'Ward B'
  },
  {
    id: 'wb-meth',
    type: 'METHANE',
    label: 'Ward B Methane',
    unit: 'ppm',
    safeRange: [0, 200],
    warningThreshold: 200,
    location: 'Ward B'
  },

  // Ward C Sensors
  {
    id: 'wc-temp',
    type: 'TEMPERATURE',
    label: 'Ward C Temp',
    unit: '°C',
    safeRange: [22, 26],
    warningThreshold: 26,
    location: 'Ward C'
  },
  {
    id: 'wc-hum',
    type: 'HUMIDITY',
    label: 'Ward C Humidity',
    unit: '%',
    safeRange: [40, 60],
    warningThreshold: 60,
    location: 'Ward C'
  },
  {
    id: 'wc-meth',
    type: 'METHANE',
    label: 'Ward C Methane',
    unit: 'ppm',
    safeRange: [0, 200],
    warningThreshold: 200,
    location: 'Ward C'
  },
];

export const HISTORY_LIMIT = 100; // Keep last 100 readings for charts
export const OFFLINE_THRESHOLD_MS = 10000; // 10 seconds without data = OFFLINE