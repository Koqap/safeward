import React from 'react';
import { SensorConfig, SensorReading } from '../types';
import { Activity, Wind, Thermometer, Droplets, CheckCircle, AlertTriangle } from 'lucide-react';

interface SensorsViewProps {
  configs: SensorConfig[];
  readings: SensorReading[];
}

export const SensorsView: React.FC<SensorsViewProps> = ({ configs, readings }) => {
  const getLatestReading = (id: string) => {
    return readings.filter(r => r.id === id).pop();
  };

  const getStatus = (reading: SensorReading | undefined, config: SensorConfig) => {
    if (!reading) return 'offline';
    if (config.type === 'METHANE') {
       if (reading.value > config.warningThreshold * 1.2) return 'critical';
       if (reading.value >= config.warningThreshold) return 'warning';
       return 'safe';
    }
    if (reading.value > config.warningThreshold) return 'warning';
    return 'safe';
  };

  const Icon = ({ type }: { type: string }) => {
    if (type === 'METHANE') return <Wind className="w-5 h-5 text-slate-500" />;
    if (type === 'TEMPERATURE') return <Thermometer className="w-5 h-5 text-slate-500" />;
    if (type === 'HUMIDITY') return <Droplets className="w-5 h-5 text-slate-500" />;
    return <Activity className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sensor Network Status</h2>
          <p className="text-slate-500">Real-time status of all connected IoT nodes</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600">
          Total Nodes: {configs.length}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Sensor ID</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Location</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Type</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Current Reading</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Last Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {configs.map(config => {
              const reading = getLatestReading(config.id);
              const status = getStatus(reading, config);
              
              return (
                <tr key={config.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    {status === 'offline' ? (
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                         Offline
                       </span>
                    ) : status === 'safe' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Online
                      </span>
                    ) : status === 'warning' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <AlertTriangle className="w-3 h-3" /> Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> Critical
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{config.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{config.location}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <Icon type={config.type} />
                       <span className="text-sm text-slate-600 capitalize">{config.type.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="font-bold text-slate-800">
                        {reading ? reading.value.toFixed(1) : '--'}
                     </span>
                     <span className="text-slate-500 text-sm ml-1">{config.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {reading ? new Date(reading.timestamp).toLocaleTimeString() : 'Never'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};