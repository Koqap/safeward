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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-neon-blue/20 dark:to-purple-900/40 rounded-2xl p-8 text-white shadow-lg dark:border dark:border-neon-blue/30 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="p-3 bg-white/20 dark:bg-neon-blue/20 rounded-xl backdrop-blur-sm shadow-inner">
             <BrainCircuit className="w-8 h-8 text-white dark:text-neon-blue" />
          </div>
          <div>
            <h2 className="text-2xl font-bold dark:text-neon-blue">SafeWard AI Analyst</h2>
            <p className="text-blue-100 dark:text-slate-300 opacity-90">Powered by Mistral AI</p>
          </div>
        </div>
        <p className="max-w-xl text-blue-50 dark:text-slate-300 leading-relaxed mb-6 relative z-10">
          Analyze recent environmental data to predict hazards, detect anomalies in HVAC systems, and generate safety compliance reports instantly.
        </p>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="relative z-10 flex items-center gap-2 bg-white text-blue-700 dark:bg-neon-blue dark:text-obsidian px-6 py-3 rounded-lg font-bold hover:bg-blue-50 dark:hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'Analyzing Data...' : 'Generate Safety Report'}
        </button>
      </div>

      {report && (
        <div className="bg-white dark:bg-charcoal/90 dark:backdrop-blur-md rounded-xl border border-slate-200 dark:border-neon-blue/30 shadow-sm p-8 animate-fade-in relative overflow-hidden">
           {/* Terminal header */}
           <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-slate-500 dark:text-neon-blue" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-neon-blue">Analysis Result</h3>
              </div>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
              </div>
           </div>
           
           <div className="prose prose-slate dark:prose-invert max-w-none">
             {/* Simple whitespace rendering if not using markdown lib, but cleaner with just preserving whitespace */}
             <pre className="whitespace-pre-wrap font-mono text-sm text-slate-600 dark:text-neon-green/90 leading-relaxed bg-slate-50 dark:bg-black/40 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-inner">
               {report}
             </pre>
           </div>
        </div>
      )}

      {/* Suggested Actions Static for Demo if no report yet */}
      {!report && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
          <div className="border border-dashed border-slate-300 dark:border-white/20 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-default">
             <p className="text-slate-500 dark:text-slate-400">Wait for sufficient data collection (approx 1 min) for better accuracy.</p>
          </div>
          <div className="border border-dashed border-slate-300 dark:border-white/20 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-default">
             <p className="text-slate-500 dark:text-slate-400">Ensure simulated Methane levels are varied to test hazard detection.</p>
          </div>
        </div>
      )}
    </div>
  );
};
