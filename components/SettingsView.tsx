import React from 'react';
import { SensorConfig } from '../types';
import { Settings, Wifi, Shield, Bell, Thermometer, Wind, Droplets, CheckCircle } from 'lucide-react';

interface SettingsViewProps {
  configs: SensorConfig[];
  isConnected: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ configs, isConnected }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-500">Configure sensor thresholds and system preferences</p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wifi className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800">Connection Status</h3>
        </div>
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          isConnected ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConnected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}></span>
          </span>
          <div>
            <p className={`font-semibold ${isConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isConnected ? 'ESP32 Connected' : 'Waiting for ESP32...'}
            </p>
            <p className="text-sm text-slate-500">
              {isConnected 
                ? 'Receiving real-time sensor data via /api/receive' 
                : 'No data received from ESP32 modules'}
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Thresholds */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800">Sensor Alert Thresholds</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          These thresholds determine when warning and critical alerts are triggered.
        </p>
        
        <div className="space-y-4">
          {configs.map(config => {
            const Icon = config.type === 'METHANE' ? Wind 
              : config.type === 'TEMPERATURE' ? Thermometer 
              : Droplets;
            
            return (
              <div key={config.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-700">{config.label}</p>
                    <p className="text-xs text-slate-400">{config.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">
                    Safe: <span className="font-semibold text-emerald-600">{config.safeRange[0]}-{config.safeRange[1]}{config.unit}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Warning: <span className="font-semibold text-amber-600">≥{config.warningThreshold}{config.unit}</span>
                  </p>
                </div>
              </div>
            );
          })}
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
