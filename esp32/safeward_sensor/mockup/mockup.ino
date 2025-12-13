/*
 * SafeWard ESP32 Offline Monitor - MOCKUP VERSION
 * 
 * This version simulates sensor data for demonstration purposes.
 * No actual sensors are required, just the OLED display and Boot Button.
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - SSD1306 OLED Display (I2C: SDA=GPIO21, SCL=GPIO22)
 * - Boot Button (GPIO 0)
 * 
 * Libraries Required:
 * - Adafruit_GFX.h
 * - Adafruit_SSD1306.h
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============ CONFIGURATION ============
// Device Configuration
const char* DEVICE_ID = "esp32-mockup-01";
const char* LOCATION = "Ward A";

// WiFi Credentials
const char* WIFI_SSID = "PLDTHOMEFIBR4TXcT";
const char* WIFI_PASSWORD = "c@binaB2025";
const char* API_ENDPOINT = "https://safeward-jcov.vercel.app/api/receive";

// OLED Display Configuration
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels
#define OLED_RESET    -1 // Reset pin # (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C // See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32

// Sensor Pins (Not used in Mockup, but defined for compatibility)
#define MQ5_PIN 34       
#define DHT_PIN 4        
#define BUTTON_PIN 0     // Boot button pin
#define LED_PIN 2        // Onboard LED pin

// Timing
#define UPDATE_INTERVAL 1000   // Update display every 1 second (Faster for demo)

// Alarm Thresholds
#define GAS_WARNING_THRESHOLD 500  // PPM threshold for warning
#define GAS_CRITICAL_THRESHOLD 1000 // PPM threshold for critical alarm

// ========================================

// Initialize Display
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Variables
unsigned long lastUpdateTime = 0;
unsigned long lastApiSendTime = 0;
#define API_SEND_INTERVAL 1000
float lastMethane = 0;
float lastTemperature = 0;
float lastHumidity = 0;
bool dhtError = false;

// LED Variables
int ledState = LOW;
unsigned long lastLedToggleTime = 0;

// Analytics Variables
float maxMethane = 0;
float maxTemperature = -999;
float minTemperature = 999;
unsigned long startTime = 0;
unsigned long totalReads = 0;
double totalMethaneSum = 0; 

// View State
enum ViewState { VIEW_MAIN, VIEW_ANALYTICS };
ViewState currentView = VIEW_MAIN;

// Button Debouncing
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

// Function Prototypes
void playIntroAnimation();
void readSensors();
void updateDisplay();
void handleButton();
void handleLED();
void drawMainView();
void drawAnalyticsView();
void sendDataToAPI(); // Added missing prototype
String formatTime(unsigned long millis);

void setup() {
  Serial.begin(115200);
  Serial.println("\n=============================");
  Serial.println("SafeWard MOCKUP Monitor");
  Serial.println("=============================");
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize OLED Display
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); 
  }
  
  // Clear the buffer
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  // Play Intro Animation
  playIntroAnimation();
  
  startTime = millis();
  
  // Start WiFi (Non-blocking)
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  Serial.println("\nSetup complete. Starting simulation...\n");
}

void loop() {
  // Check inputs
  handleButton();
  handleLED();
  
  // Update readings at intervals
  if (millis() - lastUpdateTime >= UPDATE_INTERVAL) {
    readSensors();
    updateDisplay();
    lastUpdateTime = millis();
  }
  
  // Send to API
  if (millis() - lastApiSendTime >= API_SEND_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToAPI();
    } else {
      // Only try to reconnect if enough time has passed (avoid spamming WiFi.begin)
      static unsigned long lastReconnectAttempt = 0;
      if (millis() - lastReconnectAttempt > 10000) {
        Serial.println("WiFi disconnected. Attempting to reconnect...");
        WiFi.disconnect();
        WiFi.reconnect();
        lastReconnectAttempt = millis();
      }
    }
    lastApiSendTime = millis();
  }
}

void handleButton() {
  int reading = digitalRead(BUTTON_PIN);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading == LOW) { 
       if (currentView == VIEW_MAIN) {
         currentView = VIEW_ANALYTICS;
       } else {
         currentView = VIEW_MAIN;
       }
       updateDisplay(); 
       while(digitalRead(BUTTON_PIN) == LOW) { delay(10); } 
    }
  }
  lastButtonState = reading;
}

void handleLED() {
  unsigned long currentMillis = millis();
  long interval = 0;
  
  // Determine Blink Interval
  if (lastMethane > GAS_CRITICAL_THRESHOLD) {
    interval = 100; // Fast Strobe
  } else if (lastMethane > GAS_WARNING_THRESHOLD) {
    interval = 0;   // Solid ON (Special Case)
  } else {
    interval = 1000; // Slow Heartbeat
  }
  
  // Handle Solid ON
  if (interval == 0) {
    digitalWrite(LED_PIN, HIGH);
    return;
  }
  
  // Handle Blinking
  if (currentMillis - lastLedToggleTime >= interval) {
    lastLedToggleTime = currentMillis;
    if (ledState == LOW) {
      ledState = HIGH;
    } else {
      ledState = LOW;
    }
    digitalWrite(LED_PIN, ledState);
  }
}

void playIntroAnimation() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  int prevX = 0;
  int centerY = SCREEN_HEIGHT / 2;
  int prevY = centerY;
  
  // 1. Draw ECG Trace (Keep this cool effect)
  for (int x = 0; x < SCREEN_WIDTH; x++) {
    int y = centerY;
    
    // Heartbeat Pattern
    if (x >= 40 && x < 48) {        // P Wave
       y = centerY - 6 * sin((x-40) * 3.14 / 8); 
    } else if (x >= 52 && x < 56) { // Q
       y = centerY + 5;
    } else if (x >= 56 && x < 60) { // R (Spike)
       y = centerY - 25;
    } else if (x >= 60 && x < 64) { // S
       y = centerY + 15;
    } else if (x >= 68 && x < 78) { // T Wave
       y = centerY - 8 * sin((x-68) * 3.14 / 10);
    }
    
    display.drawLine(prevX, prevY, x, y, SSD1306_WHITE);
    if (x % 2 == 0) display.display();
    prevX = x;
    prevY = y;
    
    if (x >= 52 && x <= 64) delay(2); 
    else delay(10); 
  }
  
  delay(500);
  
  // 2. Draw Shield & Text
  display.clearDisplay();
  
  // Shield Dimensions
  int shieldW = 114;
  int shieldH = 45;
  int shieldX = (SCREEN_WIDTH - shieldW) / 2; // Center X
  int shieldY = 10;
  
  // Draw Filled Shield (White Background)
  // Top Rectangle part
  display.fillRect(shieldX, shieldY, shieldW, 25, SSD1306_WHITE);
  // Bottom Triangle part
  display.fillTriangle(shieldX, shieldY + 25, shieldX + shieldW, shieldY + 25, SCREEN_WIDTH / 2, shieldY + shieldH, SSD1306_WHITE);
  
  // Draw Text (Black on White)
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(2);
  
  const char* title = "SAFEWARD";
  int len = strlen(title);
  int textX = (SCREEN_WIDTH - (len * 12)) / 2;
  int textY = shieldY + 10; // Vertically centered in the top rect part
  
  display.setCursor(textX, textY);
  display.print(title);
  
  display.display();
  
  // 3. Flash Effect (Invert colors)
  for(int i=0; i<3; i++) {
    delay(150);
    display.invertDisplay(true);
    delay(150);
    display.invertDisplay(false);
  }
  
  delay(2000); // Hold longer to admire the shield
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE); // Reset for main loop
  display.display();
}

void readSensors() {
  // --- MOCK DATA GENERATION ---
  
  // Simulate Methane (0 - 1200 PPM)
  // We want it to drift, not jump wildly
  int change = random(-50, 60); // Bias slightly upwards for drama
  lastMethane += change;
  
  // Keep within bounds
  if (lastMethane < 0) lastMethane = 0;
  if (lastMethane > 1200) lastMethane = 0; // Reset if too high to loop demo
  
  // Simulate Temp (25 - 35 C)
  lastTemperature = 25.0 + (random(0, 100) / 10.0);
  
  // Simulate Humidity (40 - 80 %)
  lastHumidity = 40.0 + (random(0, 400) / 10.0);
  
  // Simulate occasional error (1% chance)
  if (random(0, 100) > 98) {
    dhtError = true;
  } else {
    dhtError = false;
  }
  
  // --- Analytics Updates ---
  if (lastMethane > maxMethane) maxMethane = lastMethane;
  if (!dhtError) {
    if (lastTemperature > maxTemperature) maxTemperature = lastTemperature;
    if (lastTemperature < minTemperature) minTemperature = lastTemperature;
  }
  
  totalMethaneSum += lastMethane;
  totalReads++;
  
  Serial.printf("[MOCK] Methane: %.1f ppm | Temp: %.1f C | Hum: %.1f %% | Err: %s\n", 
                lastMethane, lastTemperature, lastHumidity, dhtError ? "YES" : "NO");
}

void updateDisplay() {
  display.clearDisplay();
  
  if (currentView == VIEW_MAIN) {
    drawMainView();
  } else {
    drawAnalyticsView();
  }
  
  display.display();
}

void drawMainView() {
  // Visual Alarm (Only on Critical)
  if (lastMethane > GAS_CRITICAL_THRESHOLD) {
    display.invertDisplay(true);
  } else {
    display.invertDisplay(false);
  }
  
  // --- Top Bar ---
  display.fillRect(0, 0, 128, 14, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(2, 3);
  display.print(F("SafeWard"));
  
  // WiFi Status
  display.setCursor(55, 3);
  if (WiFi.status() == WL_CONNECTED) {
    display.print(F("WIFI"));
  } else {
    display.print(F("---"));
  }
  
  // Status Indicator
  display.setCursor(80, 3); 
  if (dhtError) {
    display.print(F("ERR!"));
  } else if (lastMethane > GAS_CRITICAL_THRESHOLD) {
    display.print(F("CRITICAL"));
  } else if (lastMethane > GAS_WARNING_THRESHOLD) {
    display.print(F("WARNING"));
  } else {
    display.print(F("OK"));
  }
  
  // --- Main Content ---
  display.setTextColor(SSD1306_WHITE);
  
  // Methane / Alarm Text
  display.setCursor(0, 20);
  
  if (lastMethane > GAS_CRITICAL_THRESHOLD) {
    display.setTextSize(2);
    display.println(F("CRITICAL!"));
  } else if (lastMethane > GAS_WARNING_THRESHOLD) {
    display.setTextSize(2);
    display.println(F("WARNING!"));
  } else {
    display.setTextSize(1);
    display.println(F("METHANE LEVEL:"));
  }
  
  display.setCursor(0, 36); 
  display.setTextSize(2);
  display.print(lastMethane, 0);
  display.setTextSize(1);
  display.println(F(" ppm"));
  
  // Divider
  display.drawLine(0, 52, 128, 52, SSD1306_WHITE);
  
  // Temp & Humidity
  display.setCursor(0, 55);
  display.print(F("T:"));
  display.print(lastTemperature, 1);
  display.print(F("C"));
  
  display.setCursor(64, 55);
  display.print(F("H:"));
  display.print(lastHumidity, 1);
  display.print(F("%"));
}

void drawAnalyticsView() {
  display.invertDisplay(false); 
  display.setTextColor(SSD1306_WHITE);
  
  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("--- ANALYTICS ---"));
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  // Stats
  display.setCursor(0, 15);
  display.print(F("Max Gas: "));
  display.print(maxMethane, 0);
  display.println(F(" ppm"));
  
  display.setCursor(0, 27);
  display.print(F("Avg Gas: "));
  if (totalReads > 0) {
    display.print((float)(totalMethaneSum / totalReads), 0);
  } else {
    display.print(F("0"));
  }
  display.println(F(" ppm"));
  
  display.setCursor(0, 39);
  display.print(F("Max T: "));
  display.print(maxTemperature, 1);
  display.print(F(" C"));
  
  // Uptime
  display.setCursor(0, 54);
  display.print(F("Up: "));
  display.print(formatTime(millis() - startTime));
}

String formatTime(unsigned long millis) {
  unsigned long seconds = millis / 1000;
  unsigned long minutes = seconds / 60;
  unsigned long hours = minutes / 60;
  
  seconds %= 60;
  minutes %= 60;
  
  char buffer[10];
  sprintf(buffer, "%02lu:%02lu:%02lu", hours, minutes, seconds);
  return String(buffer);
}

void sendDataToAPI() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["location"] = LOCATION;
  doc["methane"] = lastMethane;
  doc["temperature"] = lastTemperature;
  doc["humidity"] = lastHumidity;
  if (dhtError) {
    doc["error"] = "DHT Read Error";
  }
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    Serial.printf("[API] Sent: %s | Code: %d\n", jsonPayload.c_str(), httpCode);
  } else {
    Serial.printf("[API] Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}
