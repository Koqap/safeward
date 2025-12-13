#!/usr/bin/env node
/**
 * SafeWard ESP32 Simulator
 * 
 * This script simulates an ESP32 device sending sensor data to the API.
 * Use this for testing the API without actual hardware.
 * 
 * Usage:
 *   node esp32_simulator.js [API_URL] [WARDS]
 * 
 * Example:
 *   node esp32_simulator.js https://your-app.vercel.app/api/receive
 *   node esp32_simulator.js https://your-app.vercel.app/api/receive A
 *   node esp32_simulator.js https://your-app.vercel.app/api/receive A,B
 *   node esp32_simulator.js https://your-app.vercel.app/api/receive B,C
 */

const API_URL = process.argv[2] || 'http://localhost:3000/api/receive';
const WARD_FILTER = process.argv[3] ? process.argv[3].toUpperCase().split(',') : null;

// Device configurations (simulating 3 ESP32 devices)
const ALL_DEVICES = [
  { id: 'esp32-001', location: 'Ward A' },
  { id: 'esp32-002', location: 'Ward B' },
  { id: 'esp32-003', location: 'Ward C' }
];

// Filter devices if ward filter specified
const devices = WARD_FILTER 
  ? ALL_DEVICES.filter(d => WARD_FILTER.some(w => d.location.includes(w)))
  : ALL_DEVICES;

// Simulation parameters
const SEND_INTERVAL = 3000; // 3 seconds
let sendCount = 0;

console.log('========================================');
console.log('  SafeWard ESP32 Simulator');
console.log('========================================');
console.log(`API Endpoint: ${API_URL}`);
console.log(`Simulating: ${devices.map(d => d.location).join(', ')}`);
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
  
  if (Math.random() > 0.95) {
    temperature = 28 + Math.random() * 3; // High temperature
  }

  // Simulate DHT Error
  let error = undefined;
  if (Math.random() > 0.8) { // Increased error rate for testing
    console.log(`  ⚠ ${device.location}: Simulating DHT Read Error`);
    error = "DHT22 read error";
  }
  
  return {
    device_id: device.id,
    location: device.location,
    methane: Math.round(methane * 10) / 10,
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    timestamp: Date.now(),
    error: error
  };
}

// Send data to API
async function sendReading(reading) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Bypass Vercel deployment protection for API access
        'x-vercel-protection-bypass': process.env.VERCEL_PROTECTION_BYPASS || ''
      },
      body: JSON.stringify(reading)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`  ✓ ${reading.location}: Methane=${reading.methane}ppm, Temp=${reading.temperature}°C, Humidity=${reading.humidity}%`);
    } else {
      const errorText = await response.text().catch(() => '');
      console.log(`  ✗ ${reading.location}: HTTP ${response.status} ${errorText ? `- ${errorText.substring(0, 50)}` : ''}`);
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
