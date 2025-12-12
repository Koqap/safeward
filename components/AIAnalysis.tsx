import React, { useState } from 'react';
import { SensorReading, Alert } from '../types';
import { analyzeEnvironmentalData } from '../services/geminiService';
import { BrainCircuit, Loader2, FileText, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // Ensure you have a markdown renderer or just display text

interface AIAnalysisProps {
  readings: SensorReading[];
  alerts: Alert[];
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ readings, alerts }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    setLoading(true);
    const result = await analyzeEnvironmentalData(readings, alerts);
    setReport(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
             <BrainCircuit className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">SafeWard AI Analyst</h2>
            <p className="text-blue-100 opacity-90">Powered by Gemini models</p>
          </div>
        </div>
        <p className="max-w-xl text-blue-50 leading-relaxed mb-6">
          Analyze recent environmental data to predict hazards, detect anomalies in HVAC systems, and generate safety compliance reports instantly.
        </p>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'Analyzing Data...' : 'Generate Safety Report'}
        </button>
      </div>

      {report && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 animate-fade-in">
           <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <FileText className="w-6 h-6 text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-800">Analysis Result</h3>
           </div>
           <div className="prose prose-slate max-w-none">
             {/* Simple whitespace rendering if not using markdown lib, but cleaner with just preserving whitespace */}
             <pre className="whitespace-pre-wrap font-sans text-slate-600 leading-relaxed">
               {report}
             </pre>
           </div>
        </div>
      )}

      {/* Suggested Actions Static for Demo if no report yet */}
      {!report && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
          <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center">
             <p className="text-slate-500">Wait for sufficient data collection (approx 1 min) for better accuracy.</p>
          </div>
          <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center">
             <p className="text-slate-500">Ensure simulated Methane levels are varied to test hazard detection.</p>
          </div>
        </div>
      )}
    </div>
  );
};
