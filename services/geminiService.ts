import { GoogleGenAI } from "@google/genai";
import { SensorReading, Alert } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeEnvironmentalData = async (
  readings: SensorReading[],
  alerts: Alert[]
): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Unable to perform AI analysis.";
  }

  try {
    // Summarize recent data for the prompt
    const recentReadings = readings.slice(-30); // Last 30 readings
    const dataSummary = JSON.stringify(recentReadings.map(r => ({
      t: new Date(r.timestamp).toLocaleTimeString(),
      type: r.type,
      val: r.value,
      loc: r.location
    })));

    const alertSummary = JSON.stringify(alerts.filter(a => !a.acknowledged));

    const prompt = `
      You are SafeWard AI, an expert hospital environmental safety assistant.
      
      Here is the recent sensor data from our IoT network (JSON format):
      ${dataSummary}

      Here are active alerts:
      ${alertSummary}

      Please provide a concise safety report.
      1. Analyze the trends. Is the environment stable?
      2. Identify any potential hazards (infection risks due to temp/humidity, fire risks due to methane).
      3. Recommend specific actions for hospital staff.
      
      Keep the tone professional and clinical.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "An error occurred while communicating with the AI service.";
  }
};
