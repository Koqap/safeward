#!/usr/bin/env node
/**
 * SafeWard ESP32 Simulator
 * 
 * This script simulates an ESP32 device sending sensor data to the API.
 * Use this for testing the API without actual hardware.
 * 
 * Usage:
 *   node esp32_simulator.js [API_URL]
 * 
 * Example:
 *   node esp32_simulator.js http://localhost:3000/api/receive
 *   node esp32_simulator.js https://your-app.vercel.app/api/receive
 */

const API_URL = process.argv[2] || 'http://localhost:3000/api/receive';

// Device configurations (simulating 3 ESP32 devices)
const devices = [
  { id: 'esp32-001', location: 'Ward A' },
  { id: 'esp32-002', location: 'Ward B' },
  { id: 'esp32-003', location: 'Ward C' }
];

// Simulation parameters
const SEND_INTERVAL = 3000; // 3 seconds
let sendCount = 0;

console.log('========================================');
console.log('  SafeWard ESP32 Simulator');
console.log('========================================');
console.log(`API Endpoint: ${API_URL}`);
console.log(`Simulating ${devices.length} devices`);
console.log('Press Ctrl+C to stop\n');

// Simulate sensor readings with realistic variations
function generateReading(device) {
  // Base values for safe readings
  let methane = 250 + (Math.random() - 0.5) * 100; // 200-300 ppm normally
  let temperature = 23 + (Math.random() - 0.5) * 4; // 21-25°C
  let humidity = 45 + (Math.random() - 0.5) * 10; // 40-50%
  
  // Occasionally simulate elevated readings for testing alerts
  if (Math.random() > 0.92) {
    // 8% chance of warning-level methane (800-960 ppm)
    methane = 800 + Math.random() * 160;
    console.log(`  ⚠️  ${device.location}: Simulating WARNING level methane`);
  }
  
  if (Math.random() > 0.97) {
    // 3% chance of critical methane (>960 ppm)
    methane = 960 + Math.random() * 200;
    console.log(`  🚨 ${device.location}: Simulating CRITICAL level methane`);
  }
  
  // Temperature variations
  if (Math.random() > 0.95) {
    temperature = 28 + Math.random() * 3; // High temperature
  }
  
  return {
    device_id: device.id,
    location: device.location,
    methane: Math.round(methane * 10) / 10,
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    timestamp: Date.now()
  };
}

// Send data to API
async function sendReading(reading) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reading)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`  ✓ ${reading.location}: Methane=${reading.methane}ppm, Temp=${reading.temperature}°C, Humidity=${reading.humidity}%`);
    } else {
      console.log(`  ✗ ${reading.location}: HTTP ${response.status}`);
    }
  } catch (error) {
    console.log(`  ✗ ${reading.location}: ${error.message}`);
  }
}

// Main simulation loop
async function simulate() {
  sendCount++;
  console.log(`\n[${new Date().toLocaleTimeString()}] Sending batch #${sendCount}`);
  
  // Send readings from all devices
  for (const device of devices) {
    const reading = generateReading(device);
    await sendReading(reading);
  }
}

// Start simulation
simulate();
const interval = setInterval(simulate, SEND_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nSimulation stopped.');
  console.log(`Total batches sent: ${sendCount}`);
  clearInterval(interval);
  process.exit(0);
});
