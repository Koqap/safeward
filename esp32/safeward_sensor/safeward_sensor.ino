/*
 * SafeWard ESP32 Sensor Module
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - MQ-5 Methane/Gas Sensor (connected to GPIO 34 - ADC)
 * - DHT22 Temperature & Humidity Sensor (connected to GPIO 4)
 * 
 * Libraries Required:
 * - WiFi.h (built-in)
 * - HTTPClient.h (built-in)
 * - DHT.h (Adafruit DHT Sensor Library)
 * - ArduinoJson.h (for JSON handling)
 * 
 * Install libraries via Arduino Library Manager:
 * - "DHT sensor library" by Adafruit
 * - "ArduinoJson" by Benoit Blanchon
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ============ CONFIGURATION ============
// WiFi Credentials - CHANGE THESE
const char* WIFI_SSID = "PLDTHOMEFIBR4TXcT";
const char* WIFI_PASSWORD = "c@binaB2025";

// Vercel API Endpoint - CHANGE THIS to your Vercel deployment URL
const char* API_ENDPOINT = "https://safeward-jcov.vercel.app/api/receive";

// Device Configuration
const char* DEVICE_ID = "esp32-001";
const char* LOCATION = "Ward A";  // Change for each ESP32: "Ward A", "Ward B", "Ward C"

// Sensor Pins
#define MQ5_PIN 34       // Analog pin for MQ-5 methane sensor
#define DHT_PIN 4        // Digital pin for DHT22 sensor
#define DHT_TYPE DHT22   // DHT22 sensor type

// Timing
#define SEND_INTERVAL 5000   // Send data every 5 seconds (5000ms)
#define WIFI_TIMEOUT 10000   // WiFi connection timeout (10 seconds)

// MQ-5 Calibration (adjust based on your sensor)
#define MQ5_RL 10.0      // Load resistance in kOhm
#define MQ5_RO 9.83      // Sensor resistance in clean air (calibrate this!)
#define MQ5_MIN_PPM 200  // Minimum detectable PPM
#define MQ5_MAX_PPM 10000 // Maximum detectable PPM
// ========================================

// Initialize DHT sensor
DHT dht(DHT_PIN, DHT_TYPE);

// Variables
unsigned long lastSendTime = 0;
float lastMethane = 0;
float lastTemperature = 0;
float lastHumidity = 0;
String lastError = "";

void setup() {
  Serial.begin(115200);
  Serial.println("\n=============================");
  Serial.println("SafeWard ESP32 Sensor Module");
  Serial.println("=============================");
  
  // Initialize sensors
  dht.begin();
  pinMode(MQ5_PIN, INPUT);
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\nSetup complete. Starting sensor readings...\n");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }
  
  // Read and send data at intervals
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    // Read sensors
    readSensors();
    
    // Send to API
    sendDataToAPI();
    
    lastSendTime = millis();
  }
  
  delay(100);  // Small delay for stability
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("  IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi connection failed!");
  }
}

void readSensors() {
  // Read MQ-5 Methane Sensor
  int mq5Raw = analogRead(MQ5_PIN);
  lastMethane = convertMQ5ToPPM(mq5Raw);
  
  // Read DHT22 Temperature & Humidity
  lastHumidity = dht.readHumidity();
  lastTemperature = dht.readTemperature();  // Celsius
  
  // Check for DHT read errors
  if (isnan(lastHumidity) || isnan(lastTemperature)) {
    Serial.println("⚠ DHT22 read error!");
    lastError = "DHT22 read error";
    lastHumidity = 0;
    lastTemperature = 0;
  } else {
    lastError = "";
  }
  
  // Print readings to Serial Monitor
  Serial.println("--- Sensor Readings ---");
  Serial.printf("  MQ-5 Raw: %d\n", mq5Raw);
  Serial.printf("  Methane: %.1f ppm\n", lastMethane);
  Serial.printf("  Temperature: %.1f °C\n", lastTemperature);
  Serial.printf("  Humidity: %.1f %%\n", lastHumidity);
  Serial.println("-----------------------");
}

float convertMQ5ToPPM(int rawValue) {
  /*
   * MQ-5 PPM Conversion
   * This is a simplified conversion - for accurate readings,
   * calibrate your sensor in clean air and with known gas concentrations.
   * 
   * The MQ-5 datasheet provides a Rs/Ro vs PPM curve for different gases.
   * For methane (CH4), we use an approximation.
   */
  
  if (rawValue == 0) return 0;
  
  // Convert ADC value to voltage (ESP32 ADC is 12-bit: 0-4095)
  float voltage = rawValue * (3.3 / 4095.0);
  
  // Calculate sensor resistance
  float rs = ((3.3 * MQ5_RL) / voltage) - MQ5_RL;
  
  // Calculate Rs/Ro ratio
  float ratio = rs / MQ5_RO;
  
  // Convert ratio to PPM using logarithmic approximation
  // Based on MQ-5 datasheet curve for methane
  // PPM = 1000 * (ratio)^(-2.95) - approximate formula
  float ppm = 1000.0 * pow(ratio, -2.95);
  
  // Clamp to reasonable range
  if (ppm < MQ5_MIN_PPM) ppm = 0;
  if (ppm > MQ5_MAX_PPM) ppm = MQ5_MAX_PPM;
  
  return ppm;
}

void sendDataToAPI() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Cannot send data - WiFi not connected");
    return;
  }
  
  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["location"] = LOCATION;
  doc["methane"] = lastMethane;
  doc["temperature"] = lastTemperature;
  doc["humidity"] = lastHumidity;
  if (lastError != "") {
    doc["error"] = lastError;
  }
  doc["timestamp"] = millis();  // Note: In production, use NTP for real timestamps
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.print("Sending to API: ");
  Serial.println(jsonPayload);
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      Serial.println("✓ Data sent successfully!");
      Serial.print("  Response: ");
      Serial.println(response);
    } else {
      Serial.printf("✗ HTTP Error: %d\n", httpCode);
    }
  } else {
    Serial.printf("✗ Connection failed: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
  Serial.println();
}

/*
 * WIRING DIAGRAM:
 * 
 * ESP32          MQ-5 Sensor
 * ------         -----------
 * 3.3V   ------> VCC
 * GND    ------> GND
 * GPIO34 ------> AOUT (Analog Output)
 * 
 * ESP32          DHT22 Sensor
 * ------         ------------
 * 3.3V   ------> VCC (Pin 1)
 * GPIO4  ------> DATA (Pin 2) [with 10K pull-up resistor to VCC]
 * NC     ------> NC (Pin 3 - not connected)
 * GND    ------> GND (Pin 4)
 * 
 * NOTE: Some DHT22 modules have built-in pull-up resistor.
 *       The MQ-5 sensor needs 24-48 hours of "burn-in" time
 *       for accurate readings when first powered on.
 */
