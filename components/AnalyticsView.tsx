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
      <div className="space-y-2">
        {Object.entries(data).map(([label, value]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-20">{label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-full ${color} rounded-full transition-all duration-500`}
                style={{ width: `${((value as number) / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700 w-8 text-right">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h2>
        <p className="text-slate-500">Statistical analysis of ESP32 sensor data and alerts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <BarChart2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Alerts</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">Critical</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">Warnings</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{stats.warning}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-500">Data Points</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.totalReadings}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts by Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Alerts by Sensor Type</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wind className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-slate-700">Methane (MQ-5)</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{stats.byType.methane}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Thermometer className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-slate-700">Temperature</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{stats.byType.temperature}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Droplets className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-slate-700">Humidity</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{stats.byType.humidity}</span>
            </div>
          </div>
        </div>

        {/* Alerts by Location */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Alerts by Location</h3>
          {Object.keys(stats.byLocation).length > 0 ? (
            <BarChart data={stats.byLocation} color="bg-indigo-500" />
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No alert data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Sensor Reading Statistics */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Sensor Reading Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Methane Stats */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Wind className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800">Methane (ppm)</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Average</span>
                <span className="font-bold text-purple-700">{stats.readings.methane.avg.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Maximum</span>
                <span className="font-bold text-purple-700">{stats.readings.methane.max.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Minimum</span>
                <span className="font-bold text-purple-700">{stats.readings.methane.min.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Temperature Stats */}
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <Thermometer className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-800">Temperature (°C)</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Average</span>
                <span className="font-bold text-orange-700">{stats.readings.temperature.avg.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Maximum</span>
                <span className="font-bold text-orange-700">{stats.readings.temperature.max.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Minimum</span>
                <span className="font-bold text-orange-700">{stats.readings.temperature.min.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Humidity Stats */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">Humidity (%)</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Average</span>
                <span className="font-bold text-blue-700">{stats.readings.humidity.avg.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Maximum</span>
                <span className="font-bold text-blue-700">{stats.readings.humidity.max.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Minimum</span>
                <span className="font-bold text-blue-700">{stats.readings.humidity.min.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
