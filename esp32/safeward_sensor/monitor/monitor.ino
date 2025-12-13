/*
 * SafeWard ESP32 Offline Monitor
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - MQ-5 Methane/Gas Sensor (connected to GPIO 34 - ADC)
 * - DHT22 Temperature & Humidity Sensor (connected to GPIO 4)
 * - SSD1306 OLED Display (I2C: SDA=GPIO21, SCL=GPIO22)
 * - Boot Button (GPIO 0) - Used to toggle views
 * 
 * Libraries Required:
 * - DHT.h (Adafruit DHT Sensor Library)
 * - Adafruit_GFX.h (Adafruit GFX Library)
 * - Adafruit_SSD1306.h (Adafruit SSD1306)
 * 
 * Install libraries via Arduino Library Manager:
 * - "DHT sensor library" by Adafruit
 * - "Adafruit GFX Library" by Adafruit
 * - "Adafruit SSD1306" by Adafruit
 * 
 * WIRING for OLED (GND, VDD, SCK, SDA):
 * - GND  -> ESP32 GND
 * - VDD  -> ESP32 3.3V
 * - SCK  -> ESP32 GPIO 22 (SCL)
 * - SDA  -> ESP32 GPIO 21 (SDA)
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ============ CONFIGURATION ============
// Device Configuration
const char* DEVICE_ID = "esp32-monitor-01";

// OLED Display Configuration
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels
#define OLED_RESET    -1 // Reset pin # (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C // See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32

// Sensor Pins
#define MQ5_PIN 34       // Analog pin for MQ-5 methane sensor
#define DHT_PIN 4        // Digital pin for DHT22 sensor
#define DHT_TYPE DHT11   // DHT11 sensor type
#define BUTTON_PIN 0     // Boot button pin
#define LED_PIN 2        // Onboard LED pin

// Timing
#define UPDATE_INTERVAL 2000   // Update display every 2 seconds
#define SENSOR_READ_DELAY 200  // Small delay between sensor reads

// MQ-5 Calibration
#define MQ5_RL 10.0      // Load resistance in kOhm
#define MQ5_RO 9.83      // Sensor resistance in clean air
#define MQ5_MIN_PPM 200  // Minimum detectable PPM
#define MQ5_MAX_PPM 10000 // Maximum detectable PPM
#define GAS_WARNING_THRESHOLD 500  // PPM threshold for warning
#define GAS_CRITICAL_THRESHOLD 1000 // PPM threshold for critical alarm

// Smoothing
#define NUM_SAMPLES 10   // Number of samples for smoothing
// ========================================

// Initialize sensors and display
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Variables
unsigned long lastUpdateTime = 0;
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
double totalMethaneSum = 0; // Use double to prevent overflow

// View State
enum ViewState { VIEW_MAIN, VIEW_ANALYTICS };
ViewState currentView = VIEW_MAIN;

// Button Debouncing
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;

// Smoothing arrays
int mq5Samples[NUM_SAMPLES];
int sampleIndex = 0;

// Function Prototypes
void playIntroAnimation();
void readSensors();
void updateDisplay();
void handleButton();
void handleLED();
void drawMainView();
void drawAnalyticsView();
float convertMQ5ToPPM(int rawValue);
String formatTime(unsigned long millis);

void setup() {
  Serial.begin(115200);
  Serial.println("\n=============================");
  Serial.println("SafeWard Offline Monitor");
  Serial.println("=============================");
  
  // Initialize sensors
  dht.begin();
  pinMode(MQ5_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize OLED Display
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }
  
  // Clear the buffer
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  
  // Play Intro Animation
  playIntroAnimation();
  
  // Initialize smoothing array
  for(int i=0; i<NUM_SAMPLES; i++) {
    mq5Samples[i] = analogRead(MQ5_PIN);
    delay(10);
  }
  
  startTime = millis();
  Serial.println("\nSetup complete. Starting monitoring...\n");
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
}

void handleButton() {
  int reading = digitalRead(BUTTON_PIN);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    // If the button state has changed:
    if (reading == LOW) { // Button Pressed (Active LOW)
       // Toggle View
       if (currentView == VIEW_MAIN) {
         currentView = VIEW_ANALYTICS;
       } else {
         currentView = VIEW_MAIN;
       }
       updateDisplay(); // Update immediately
       
       // Simple wait to prevent multiple toggles on one press
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
  // --- MQ-5 Smoothing ---
  mq5Samples[sampleIndex] = analogRead(MQ5_PIN);
  sampleIndex = (sampleIndex + 1) % NUM_SAMPLES;
  
  long sum = 0;
  for(int i=0; i<NUM_SAMPLES; i++) {
    sum += mq5Samples[i];
  }
  int mq5Raw = sum / NUM_SAMPLES;
  
  lastMethane = convertMQ5ToPPM(mq5Raw);
  
  // --- DHT22 Reading ---
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  if (isnan(h) || isnan(t)) {
    Serial.println("⚠ DHT22 read error!");
    dhtError = true;
    if (lastHumidity == 0 && lastTemperature == 0) {
        // Keep 0
    }
  } else {
    dhtError = false;
    lastHumidity = h;
    lastTemperature = t;
  }
  
  // --- Analytics Updates ---
  if (lastMethane > maxMethane) maxMethane = lastMethane;
  if (!dhtError) {
    if (lastTemperature > maxTemperature) maxTemperature = lastTemperature;
    if (lastTemperature < minTemperature) minTemperature = lastTemperature;
  }
  
  totalMethaneSum += lastMethane;
  totalReads++;
  
  Serial.printf("Methane: %.1f ppm | Temp: %.1f C | Hum: %.1f %% | Err: %s\n", 
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
  
  // Status Indicator
  display.setCursor(80, 3); // Moved left slightly to fit longer text
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
  
  display.setCursor(0, 36); // Adjusted Y for larger text
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
  display.invertDisplay(false); // Ensure normal colors
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

float convertMQ5ToPPM(int rawValue) {
  if (rawValue == 0) return 0;
  
  float voltage = rawValue * (3.3 / 4095.0);
  float rs = ((3.3 * MQ5_RL) / voltage) - MQ5_RL;
  float ratio = rs / MQ5_RO;
  float ppm = 1000.0 * pow(ratio, -2.95);
  
  if (ppm < MQ5_MIN_PPM) ppm = 0;
  if (ppm > MQ5_MAX_PPM) ppm = MQ5_MAX_PPM;
  
  return ppm;
}

