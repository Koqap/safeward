import React, { useMemo } from 'react';
import { SensorReading, Alert, SensorConfig } from '../types';
import { BarChart2, TrendingUp, AlertTriangle, Activity, Thermometer, Droplets, Wind, Clock, PieChart as PieChartIcon } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

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

  // Prepare data for charts
  const trendData = useMemo(() => {
    // Group readings by timestamp (approximate to nearest minute or just use raw if sparse)
    // For simplicity, we'll take the last 20 readings of each type and merge them by index if timestamps align, 
    // or just map them individually. 
    // Better approach: Create a unified timeline.
    
    // Sort all readings by time
    const sortedReadings = [...readings].sort((a, b) => a.timestamp - b.timestamp);
    
    // Take the last 50 readings to avoid overcrowding
    const recentReadings = sortedReadings.slice(-50);

    return recentReadings.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: r.value,
      type: r.type,
      // Add specific fields for multi-line chart if needed, but since types are mixed in the array, 
      // we might need to filter.
      // Let's create separate arrays for the chart if we want to overlay them, 
      // but since scales are different (ppm vs C vs %), separate charts or dual axis is better.
      // For this UI, let's do separate small trend lines or one main chart with normalized values?
      // Let's do separate charts for clarity.
    }));
  }, [readings]);

  const methaneData = readings.filter(r => r.type === 'METHANE').slice(-20).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: r.value
  }));

  const tempData = readings.filter(r => r.type === 'TEMPERATURE').slice(-20).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: r.value
  }));

  const humidityData = readings.filter(r => r.type === 'HUMIDITY').slice(-20).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: r.value
  }));

  const alertSeverityData = [
    { name: 'Critical', value: stats.critical, color: '#ff003c' }, // neon-red
    { name: 'Warning', value: stats.warning, color: '#ffcc00' },   // neon-amber
    { name: 'Safe', value: stats.total - stats.critical - stats.warning, color: '#45a29e' } // neon-blue
  ].filter(d => d.value > 0);

  const locationData = Object.entries(stats.byLocation).map(([name, value]) => ({
    name,
    value
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-300 text-xs mb-1">{label}</p>
          <p className="text-white font-bold text-sm">
            {payload[0].value}
            <span className="text-slate-400 ml-1 text-xs">
              {payload[0].name === 'value' ? '' : payload[0].name}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analytics Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400">Statistical analysis of ESP32 sensor data and alerts</p>
        </div>
        <div className="text-right hidden sm:block">
           <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">Last Updated</p>
           <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{new Date().toLocaleTimeString()}</p>
        </div>
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

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Distribution (Pie) */}
        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-slate-400" />
            Alert Distribution
          </h3>
          <div className="flex-1 min-h-[250px] relative">
            {alertSeverityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertSeverityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {alertSeverityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-[0_0_10px_rgba(0,0,0,0.3)]" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-col gap-2">
                <PieChartIcon className="w-10 h-10 opacity-20" />
                <span className="text-sm">No alert data available</span>
              </div>
            )}
          </div>
        </div>

        {/* Alerts by Location (Bar) */}
        <div className="lg:col-span-2 bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            Alerts by Location
          </h3>
          <div className="flex-1 min-h-[250px]">
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                     {locationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#45a29e' : '#66fcf1'} className="drop-shadow-[0_0_5px_rgba(69,162,158,0.5)]" />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 flex-col gap-2">
                <Activity className="w-10 h-10 opacity-20" />
                <span className="text-sm">No location data available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Methane Trend */}
        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Wind className="w-5 h-5 text-purple-500" />
            Methane Levels (Last 20 Readings)
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={methaneData}>
                <defs>
                  <linearGradient id="colorMethane" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorMethane)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Trend */}
        <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-orange-500" />
            Temperature Trends
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sensor Reading Statistics Cards (Kept from previous design but compacted) */}
      <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Detailed Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Methane Stats */}
          <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-purple-900 dark:text-purple-300 text-sm">Methane (ppm)</span>
              <Wind className="w-4 h-4 text-purple-500" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg</p>
                <p className="font-bold text-purple-700 dark:text-purple-400">{stats.readings.methane.avg.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Max</p>
                <p className="font-bold text-purple-700 dark:text-purple-400">{stats.readings.methane.max.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Min</p>
                <p className="font-bold text-purple-700 dark:text-purple-400">{stats.readings.methane.min.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Temperature Stats */}
          <div className="p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-500/20">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-orange-900 dark:text-orange-300 text-sm">Temp (°C)</span>
              <Thermometer className="w-4 h-4 text-orange-500" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg</p>
                <p className="font-bold text-orange-700 dark:text-orange-400">{stats.readings.temperature.avg.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Max</p>
                <p className="font-bold text-orange-700 dark:text-orange-400">{stats.readings.temperature.max.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Min</p>
                <p className="font-bold text-orange-700 dark:text-orange-400">{stats.readings.temperature.min.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Humidity Stats */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-blue-900 dark:text-blue-300 text-sm">Humidity (%)</span>
              <Droplets className="w-4 h-4 text-blue-500" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg</p>
                <p className="font-bold text-blue-700 dark:text-blue-400">{stats.readings.humidity.avg.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Max</p>
                <p className="font-bold text-blue-700 dark:text-blue-400">{stats.readings.humidity.max.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Min</p>
                <p className="font-bold text-blue-700 dark:text-blue-400">{stats.readings.humidity.min.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
