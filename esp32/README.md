# SafeWard ESP32 Setup Guide

This guide explains how to set up the ESP32 hardware and software for the SafeWard IoT monitoring system.

## Hardware Requirements

### Per Ward Setup (3 wards = 3 ESP32 modules)
- 1x ESP32 Development Board (ESP32-WROOM-32 recommended)
- 1x MQ-5 Methane/Gas Sensor Module
- 1x DHT22 Temperature & Humidity Sensor
- Jumper wires
- 5V Power supply or USB cable

## Wiring Diagram

### ESP32 to MQ-5 Sensor
| ESP32 Pin | MQ-5 Pin | Description |
|-----------|----------|-------------|
| 3.3V      | VCC      | Power       |
| GND       | GND      | Ground      |
| GPIO 34   | AOUT     | Analog Out  |

### ESP32 to DHT22 Sensor
| ESP32 Pin | DHT22 Pin | Description |
|-----------|-----------|-------------|
| 3.3V      | Pin 1     | Power (VCC) |
| GPIO 4    | Pin 2     | Data        |
| -         | Pin 3     | NC          |
| GND       | Pin 4     | Ground      |

**Note:** Add a 10K pull-up resistor between GPIO 4 and 3.3V for DHT22 if your module doesn't have one built-in.

## Software Setup

### 1. Install Arduino IDE
Download and install from [arduino.cc](https://www.arduino.cc/en/software)

### 2. Add ESP32 Board Support
1. Open Arduino IDE
2. Go to File > Preferences
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to Tools > Board > Boards Manager
5. Search for "esp32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries
Go to Sketch > Include Library > Manage Libraries and install:
- "DHT sensor library" by Adafruit
- "ArduinoJson" by Benoit Blanchon

### 4. Configure the Code
Open `safeward_sensor.ino` and modify these settings:

```cpp
// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API Endpoint (your Vercel deployment URL)
const char* API_ENDPOINT = "https://your-safeward-app.vercel.app/api/receive";

// Device Configuration (change for each ESP32)
const char* DEVICE_ID = "esp32-001";  // esp32-001, esp32-002, esp32-003
const char* LOCATION = "Ward A";       // Ward A, Ward B, Ward C
```

### 5. Upload the Code
1. Connect ESP32 via USB
2. Select your board: Tools > Board > ESP32 Dev Module
3. Select the correct port: Tools > Port > (your ESP32 port)
4. Click Upload

## MQ-5 Sensor Calibration

The MQ-5 sensor requires calibration for accurate readings:

1. **Burn-in Period**: Run the sensor for 24-48 hours before first use
2. **Clean Air Calibration**: 
   - Place sensor in clean air
   - Read the resistance value
   - Update `MQ5_RO` in the code with this value

## Testing Without Hardware

Use the simulator script to test the API without physical hardware:

```bash
# Navigate to esp32 directory
cd esp32

# Run simulator (Node.js required)
node esp32_simulator.js https://your-safeward-app.vercel.app/api/receive

# Or for local testing
node esp32_simulator.js http://localhost:3000/api/receive
```

## Troubleshooting

### WiFi Connection Issues
- Check SSID and password
- Ensure ESP32 is within WiFi range
- ESP32 only supports 2.4GHz WiFi

### Sensor Reading Issues
- Check wiring connections
- Verify power supply is adequate
- Allow MQ-5 warm-up time (2-3 minutes minimum)

### API Connection Issues
- Verify API endpoint URL is correct
- Check CORS settings if running locally
- Ensure Vercel deployment is active
