import React, { useMemo } from 'react';
import { SensorReading, Alert, SensorConfig } from '../types';
import { BarChart2, TrendingUp, AlertTriangle, Activity, Thermometer, Droplets, Wind, Clock } from 'lucide-react';

interface AnalyticsViewProps {
  configs: SensorConfig[];
  readings: SensorReading[];
  alerts: Alert[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ configs, readings, alerts }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
    const warningAlerts = alerts.filter(a => a.severity === 'WARNING').length;
    const acknowledgedAlerts = alerts.filter(a => a.acknowledged).length;

    // Alerts by type
    const methaneAlerts = alerts.filter(a => a.message.toLowerCase().includes('methane')).length;
    const tempAlerts = alerts.filter(a => a.message.toLowerCase().includes('temperature')).length;
    const humidityAlerts = alerts.filter(a => a.message.toLowerCase().includes('humidity')).length;

    // Alerts by location
    const alertsByLocation: Record<string, number> = {};
    alerts.forEach(a => {
      const location = a.message.match(/Ward [A-C]/)?.[0] || 'Unknown';
      alertsByLocation[location] = (alertsByLocation[location] || 0) + 1;
    });

    // Sensor reading averages
    const getAverage = (type: string) => {
      const typeReadings = readings.filter(r => r.type === type);
      if (typeReadings.length === 0) return 0;
      return typeReadings.reduce((sum, r) => sum + r.value, 0) / typeReadings.length;
    };

    const getMax = (type: string) => {
      const typeReadings = readings.filter(r => r.type === type);
      if (typeReadings.length === 0) return 0;
      return Math.max(...typeReadings.map(r => r.value));
    };

    const getMin = (type: string) => {
      const typeReadings = readings.filter(r => r.type === type);
      if (typeReadings.length === 0) return 0;
      return Math.min(...typeReadings.map(r => r.value));
    };

    return {
      total: totalAlerts,
      critical: criticalAlerts,
      warning: warningAlerts,
      acknowledged: acknowledgedAlerts,
      byType: { methane: methaneAlerts, temperature: tempAlerts, humidity: humidityAlerts },
      byLocation: alertsByLocation,
      readings: {
        methane: { avg: getAverage('METHANE'), max: getMax('METHANE'), min: getMin('METHANE') },
        temperature: { avg: getAverage('TEMPERATURE'), max: getMax('TEMPERATURE'), min: getMin('TEMPERATURE') },
        humidity: { avg: getAverage('HUMIDITY'), max: getMax('HUMIDITY'), min: getMin('HUMIDITY') }
      },
      totalReadings: readings.length
    };
  }, [alerts, readings]);

  // Simple bar chart component
  const BarChart: React.FC<{ data: Record<string, number>; color: string }> = ({ data, color }) => {
    const values = Object.values(data) as number[];
    const maxValue = Math.max(...values, 1);
    return (
      <div className="space-y-4">
        {Object.entries(data).map(([label, value]) => (
          <div key={label} className="flex items-center gap-4 group">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-24 truncate">{label}</span>
            <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className={`h-full ${color} rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 relative overflow-hidden shadow-[0_0_10px_currentColor]`}
                style={{ width: `${((value as number) / maxValue) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analytics Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400">Statistical analysis of ESP32 sensor data and alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-neon-blue/20 rounded-xl text-blue-600 dark:text-neon-blue group-hover:bg-blue-600 dark:group-hover:bg-neon-blue group-hover:text-white dark:group-hover:text-obsidian transition-colors shadow-sm">
              <BarChart2 className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Alerts</span>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{stats.total}</p>
        </div>

        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 dark:bg-neon-red/20 rounded-xl text-red-600 dark:text-neon-red group-hover:bg-red-600 dark:group-hover:bg-neon-red group-hover:text-white dark:group-hover:text-obsidian transition-colors shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Critical</span>
          </div>
          <p className="text-4xl font-black text-red-600 dark:text-neon-red tracking-tight drop-shadow-[0_0_8px_rgba(255,0,60,0.5)]">{stats.critical}</p>
        </div>

        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 dark:bg-neon-amber/20 rounded-xl text-amber-600 dark:text-neon-amber group-hover:bg-amber-600 dark:group-hover:bg-neon-amber group-hover:text-white dark:group-hover:text-obsidian transition-colors shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Warnings</span>
          </div>
          <p className="text-4xl font-black text-amber-600 dark:text-neon-amber tracking-tight drop-shadow-[0_0_8px_rgba(255,204,0,0.5)]">{stats.warning}</p>
        </div>

        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-neon-green/20 rounded-xl text-emerald-600 dark:text-neon-green group-hover:bg-emerald-600 dark:group-hover:bg-neon-green group-hover:text-white dark:group-hover:text-obsidian transition-colors shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Data Points</span>
          </div>
          <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{stats.totalReadings}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts by Type */}
        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
            Alerts by Sensor Type
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-sm">
                  <Wind className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Methane (MQ-5)</span>
              </div>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400">{stats.byType.methane}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-sm">
                  <Thermometer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Temperature</span>
              </div>
              <span className="text-xl font-black text-orange-600 dark:text-orange-400">{stats.byType.temperature}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white dark:bg-charcoal rounded-lg shadow-sm">
                  <Droplets className="w-5 h-5 text-blue-600 dark:text-neon-blue" />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Humidity</span>
              </div>
              <span className="text-xl font-black text-blue-600 dark:text-neon-blue">{stats.byType.humidity}</span>
            </div>
          </div>
        </div>

        {/* Alerts by Location */}
        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            Alerts by Location
          </h3>
          {Object.keys(stats.byLocation).length > 0 ? (
            <div className="mt-8">
              <BarChart data={stats.byLocation} color="bg-indigo-500 dark:bg-indigo-400" />
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No alert data recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Sensor Reading Statistics */}
      <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Sensor Reading Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Methane Stats */}
          <div className="p-5 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-500/20 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 dark:group-hover:bg-purple-500 group-hover:text-white dark:group-hover:text-white transition-colors">
                <Wind className="w-5 h-5" />
              </div>
              <span className="font-bold text-purple-900 dark:text-purple-300">Methane (ppm)</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Average</span>
                <span className="font-bold text-purple-700 dark:text-purple-400 text-lg">{stats.readings.methane.avg.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Maximum</span>
                <span className="font-bold text-purple-700 dark:text-purple-400 text-lg">{stats.readings.methane.max.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Minimum</span>
                <span className="font-bold text-purple-700 dark:text-purple-400 text-lg">{stats.readings.methane.min.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Temperature Stats */}
          <div className="p-5 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-500/20 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 dark:group-hover:bg-orange-500 group-hover:text-white dark:group-hover:text-white transition-colors">
                <Thermometer className="w-5 h-5" />
              </div>
              <span className="font-bold text-orange-900 dark:text-orange-300">Temperature (°C)</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Average</span>
                <span className="font-bold text-orange-700 dark:text-orange-400 text-lg">{stats.readings.temperature.avg.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Maximum</span>
                <span className="font-bold text-orange-700 dark:text-orange-400 text-lg">{stats.readings.temperature.max.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Minimum</span>
                <span className="font-bold text-orange-700 dark:text-orange-400 text-lg">{stats.readings.temperature.min.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Humidity Stats */}
          <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white dark:group-hover:text-white transition-colors">
                <Droplets className="w-5 h-5" />
              </div>
              <span className="font-bold text-blue-900 dark:text-blue-300">Humidity (%)</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Average</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">{stats.readings.humidity.avg.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Maximum</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">{stats.readings.humidity.max.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/60 dark:bg-white/5 rounded-lg">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Minimum</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">{stats.readings.humidity.min.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
