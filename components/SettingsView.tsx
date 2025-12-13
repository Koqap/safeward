import React from 'react';
import { SensorConfig } from '../types';
import { Settings, Wifi, Shield, Bell, Thermometer, Wind, Droplets, CheckCircle, Sliders } from 'lucide-react';

interface SettingsViewProps {
  configs: SensorConfig[];
  isConnected: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ configs, isConnected }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">System Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Configure connection and alert thresholds</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 dark:bg-neon-blue/20 rounded-lg text-blue-600 dark:text-neon-blue">
                <Wifi className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Connection Configuration</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Endpoint URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={(import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api'}
                    readOnly
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-blue"
                  />
                  <button className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                    Test
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Configured via VITE_API_URL environment variable
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 dark:bg-neon-green shadow-[0_0_8px_#66fcf1]' : 'bg-red-500 dark:bg-neon-red shadow-[0_0_8px_#ff003c]'}`}></div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">System Status</span>
                </div>
                <span className={`text-sm font-bold ${isConnected ? 'text-emerald-600 dark:text-neon-green' : 'text-red-600 dark:text-neon-red'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Threshold Settings */}
          <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 dark:bg-neon-amber/20 rounded-lg text-amber-600 dark:text-neon-amber">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Alert Thresholds</h3>
            </div>

            <div className="space-y-6">
              {configs.slice(0, 3).map(config => (
                <div key={config.id} className="pb-6 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      {config.type === 'METHANE' ? <Wind className="w-4 h-4 text-slate-400" /> : 
                       config.type === 'TEMPERATURE' ? <Thermometer className="w-4 h-4 text-slate-400" /> :
                       <Droplets className="w-4 h-4 text-slate-400" />}
                      {config.type}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{config.id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Warning Threshold</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={config.warningThreshold}
                          readOnly
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
                        />
                        <span className="absolute right-3 top-1.5 text-xs text-slate-400">{config.unit}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Critical Threshold</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={config.criticalThreshold}
                          readOnly
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
                        />
                        <span className="absolute right-3 top-1.5 text-xs text-slate-400">{config.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800">Alert Settings</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Critical Alert Multiplier</span>
            <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">1.2x warning threshold</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Alert Debounce Time</span>
            <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">10 seconds</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-700">Data Polling Interval</span>
            <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">3 seconds</span>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="bg-slate-100 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">API Endpoints</h3>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">POST</span>
            <span className="text-slate-600">/api/receive</span>
            <span className="text-slate-400">- ESP32 sends data here</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">GET</span>
            <span className="text-slate-600">/api/readings</span>
            <span className="text-slate-400">- Frontend fetches data here</span>
          </div>
        </div>
      </div>
    </div>
  );
};
