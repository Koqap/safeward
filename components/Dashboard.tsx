import React, { useMemo, useState, useEffect } from 'react';
import { SensorConfig, SensorReading, Alert } from '../types';
import { AlertTriangle, CheckCircle, Wind, Thermometer, Droplets, Activity, Cpu, Radio, ChevronDown, Siren } from 'lucide-react';

interface DashboardProps {
  configs: SensorConfig[];
  readings: SensorReading[];
  alerts: Alert[];
}

// Group configs by location
const getGroupedConfigs = (configs: SensorConfig[]) => {
  const groups: Record<string, SensorConfig[]> = {};
  configs.forEach(c => {
    if (!groups[c.location]) groups[c.location] = [];
    groups[c.location].push(c);
  });
  return groups;
};

// Component for a single Ward's full status (Methane + Temp + Hum)
const WardRow: React.FC<{
  location: string;
  configs: SensorConfig[];
  readings: SensorReading[];
  now: number;
}> = ({ location, configs, readings, now }) => {
  
  const getReading = (type: 'METHANE' | 'TEMPERATURE' | 'HUMIDITY') => {
    const config = configs.find(c => c.type === type);
    if (!config) return null;
    return {
      config,
      data: readings.find(r => r.id === config.id)
    };
  };

  const methane = getReading('METHANE');
  const temp = getReading('TEMPERATURE');
  const hum = getReading('HUMIDITY');

  // Logic: 
  // Critical = > 20% above warning (e.g. >960 ppm)
  // Warning = > warning threshold (e.g. >800 ppm)
  const methaneValue = methane?.data?.value || 0;
  const methaneLimit = methane?.config?.warningThreshold || 0;
  
  const isCritical = methaneValue > (methaneLimit * 1.2);
  const isWarning = !isCritical && methaneValue >= methaneLimit;

  // Offline Check (15 seconds)
  const lastTimestamp = Math.max(
    methane?.data?.timestamp || 0,
    temp?.data?.timestamp || 0,
    hum?.data?.timestamp || 0
  );
  const isOffline = (now - lastTimestamp) > 15000;

  // Determine container styling based on worst state
  const hasError = methane?.data?.error || temp?.data?.error || hum?.data?.error;
  
  const statusColor = isOffline
    ? 'dark:bg-charcoal/50 dark:border-white/5 bg-slate-50 border-slate-200 opacity-75 grayscale-[0.5]'
    : hasError
      ? 'dark:bg-red-900/10 dark:border-red-500/50 bg-red-50 border-red-200'
      : isCritical 
      ? 'dark:bg-red-900/10 dark:border-neon-red/50 dark:shadow-[0_0_15px_rgba(255,0,60,0.2)] bg-red-50 border-red-200' 
      : isWarning 
        ? 'dark:bg-amber-900/10 dark:border-neon-amber/50 bg-amber-50 border-amber-200' 
        : 'dark:bg-charcoal/80 dark:border-white/10 bg-emerald-50 border-emerald-200';

  const decorativeBarColor = isOffline
    ? 'bg-slate-400 dark:bg-slate-600'
    : hasError
      ? 'bg-red-500'
    : isCritical
      ? 'bg-neon-red shadow-[0_0_10px_#ff003c]'
      : isWarning
        ? 'bg-neon-amber shadow-[0_0_10px_#ffcc00]'
        : 'bg-neon-green shadow-[0_0_10px_#66fcf1]';

  return (
    <div className={`rounded-2xl border ${statusColor} p-6 transition-all duration-300 mb-6 relative overflow-hidden group hover:shadow-lg backdrop-blur-sm ${isCritical ? 'shadow-red-100 dark:shadow-none' : 'shadow-sm'}`}>
      {/* Decorative colored bar on left */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${decorativeBarColor}`} />
      
      {/* Background gradient for critical state */}
      {isCritical && (
        <div className="absolute inset-0 bg-red-50/50 animate-pulse pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2 relative z-10">
        
        {/* Header Section */}
        <div className="flex-shrink-0 min-w-[220px]">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-xl shadow-sm ${isOffline ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400' : hasError ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : isCritical ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-neon-red' : isWarning ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-neon-amber' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-neon-green'}`}>
                {isOffline ? <Radio className="w-8 h-8" /> : hasError ? <AlertTriangle className="w-8 h-8" /> : isCritical ? <Siren className="w-8 h-8 animate-pulse" /> : isWarning ? <Wind className="w-8 h-8" /> : <Activity className="w-8 h-8" />}
             </div>
             <div>
               <h3 className="font-bold text-slate-800 dark:text-white text-xl tracking-tight">{location}</h3>
               {/* Mock Room Number logic for display */}
               <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">Room {location === 'Ward A' ? '101' : location === 'Ward B' ? '204' : '305'}</p>
               <div className="flex items-center gap-1.5 mt-1">
                 <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-slate-400' : isCritical ? 'bg-neon-red animate-ping shadow-[0_0_8px_#ff003c]' : 'bg-neon-green shadow-[0_0_5px_#66fcf1]'}`} />
                 <p className="text-[10px] text-slate-400 font-mono">ID: {methane?.config?.id.split('-')[1].toUpperCase() || '00'}</p>
               </div>
             </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8">
           {/* Methane */}
           <div className="relative group/metric">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
               Methane Level
               {isCritical && <AlertTriangle className="w-3 h-3 text-neon-red" />}
             </p>
             <div className={`text-3xl font-black tracking-tight transition-colors ${isOffline ? 'text-slate-500' : isCritical ? 'text-neon-red drop-shadow-[0_0_5px_rgba(255,0,60,0.5)]' : isWarning ? 'text-neon-amber' : 'text-neon-green'}`}>
               {methane?.data ? Math.round(methane.data.value) : '--'} 
               <span className="text-sm font-semibold ml-1 text-slate-400">ppm</span>
             </div>
             {/* Mini bar chart visual */}
             <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
               <div 
                 className={`h-full rounded-full transition-all duration-500 ${isOffline ? 'bg-slate-400' : isCritical ? 'bg-neon-red shadow-[0_0_10px_#ff003c]' : isWarning ? 'bg-neon-amber' : 'bg-neon-green'}`} 
                 style={{ width: `${Math.min(((methane?.data?.value || 0) / 1000) * 100, 100)}%` }}
               />
             </div>
           </div>

           {/* Temperature */}
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Temperature</p>
             <div className="text-3xl font-black text-slate-700 dark:text-slate-200 tracking-tight">
               {temp?.data ? temp.data.value.toFixed(1) : '--'}
               <span className="text-sm font-semibold ml-1 text-slate-400">°C</span>
             </div>
             <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
               <div 
                 className="h-full rounded-full bg-blue-500 dark:bg-neon-blue transition-all duration-500"
                 style={{ width: `${Math.min(((temp?.data?.value || 0) / 40) * 100, 100)}%` }}
               />
             </div>
           </div>

           {/* Humidity */}
           <div className="hidden md:block">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Humidity</p>
             <div className="text-3xl font-black text-slate-700 dark:text-slate-200 tracking-tight">
               {hum?.data ? Math.round(hum.data.value) : '--'}
               <span className="text-sm font-semibold ml-1 text-slate-400">%</span>
             </div>
             <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
               <div 
                 className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400 transition-all duration-500"
                 style={{ width: `${Math.min((hum?.data?.value || 0), 100)}%` }}
               />
             </div>
           </div>
        </div>

        {/* Status Pill & Action */}
        <div className="self-start md:self-center flex flex-col items-end gap-3">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm
            ${isOffline ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10' : hasError ? 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-500/50' : isCritical ? 'bg-red-100 text-red-700 animate-pulse ring-2 ring-red-200 dark:bg-red-500/20 dark:text-neon-red dark:ring-neon-red/50 dark:shadow-[0_0_10px_rgba(255,0,60,0.4)]' : isWarning ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:text-neon-amber dark:ring-neon-amber/50' : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:text-neon-green dark:ring-neon-green/50'}`}>
            {isOffline ? 'OFFLINE' : hasError ? 'SENSOR ERROR' : isCritical ? 'CRITICAL LEAK' : isWarning ? 'Warning' : 'Safe'}
          </span>
          
          <button className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 text-xs font-bold text-blue-600 dark:text-neon-blue hover:text-blue-800 dark:hover:text-cyan-300 flex items-center gap-1">
            View Details <ChevronDown className="w-3 h-3 -rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusCard: React.FC<{
  icon: React.ElementType;
  label: string;
  subLabel: string;
  countStr: string;
  status: 'Online' | 'Active' | 'Offline' | 'Waiting' | 'Attention';
  errorCount?: number;
}> = ({ icon: Icon, label, subLabel, countStr, status, errorCount = 0 }) => {
  const isOnline = status === 'Online' || status === 'Active';
  const hasError = errorCount > 0;
  
  return (
    <div className={`${hasError ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-neon-amber/30' : isOnline ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-neon-green/20' : 'bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/5'} border rounded-xl p-4 flex items-center justify-between mb-3 transition-all hover:shadow-md group`}>
       <div className="flex items-center gap-4">
          <div className={`${hasError ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-neon-amber' : isOnline ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200 dark:from-neon-green dark:to-emerald-600 dark:shadow-none' : 'bg-slate-400 dark:bg-slate-600'} p-2.5 rounded-xl text-white shadow-lg`}>
             <Icon className="w-5 h-5" />
          </div>
          <div>
             <p className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-blue-700 dark:group-hover:text-neon-blue transition-colors">{label}</p>
             <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subLabel}</p>
          </div>
       </div>
       <div className="text-right">
          <p className={`text-xl font-black ${hasError ? 'text-amber-600 dark:text-neon-amber' : isOnline ? 'text-emerald-700 dark:text-neon-green' : 'text-slate-500 dark:text-slate-500'} leading-tight tracking-tight`}>{countStr}</p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${hasError ? 'bg-amber-500 dark:bg-neon-amber animate-pulse' : isOnline ? 'bg-emerald-500 dark:bg-neon-green animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`} />
            <p className={`text-[10px] ${hasError ? 'text-amber-600 dark:text-neon-amber' : isOnline ? 'text-emerald-600 dark:text-neon-green' : 'text-slate-400 dark:text-slate-500'} font-bold uppercase tracking-wide`}>
              {hasError ? `${errorCount} Errors` : status}
            </p>
          </div>
       </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ configs, readings, alerts }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  // Get latest readings for all sensors
  const latestReadings = useMemo(() => {
    const latest: SensorReading[] = [];
    configs.forEach(c => {
      const reading = readings.filter(r => r.id === c.id).pop();
      if (reading) latest.push(reading);
    });
    return latest;
  }, [readings, configs]);

  // Calculate actual sensor status from readings
  const sensorStatus = useMemo(() => {
    const hasData = readings.length > 0;
    const methaneConfigs = configs.filter(c => c.type === 'METHANE');
    const tempHumConfigs = configs.filter(c => c.type === 'TEMPERATURE' || c.type === 'HUMIDITY');
    const locations = [...new Set(configs.map(c => c.location))];
    
    // Count how many sensors have recent readings (within last 15 seconds)
    const recentThreshold = 15000; // 15 seconds
    
    const onlineMethane = methaneConfigs.filter(c => {
      const reading = readings.filter(r => r.id === c.id).pop();
      return reading && (now - reading.timestamp) < recentThreshold && !reading.error;
    }).length;

    const errorMethane = methaneConfigs.filter(c => {
      const reading = readings.filter(r => r.id === c.id).pop();
      return reading && (now - reading.timestamp) < recentThreshold && !!reading.error;
    }).length;
    
    const onlineTempHum = tempHumConfigs.filter(c => {
      const reading = readings.filter(r => r.id === c.id).pop();
      return reading && (now - reading.timestamp) < recentThreshold && !reading.error;
    }).length;

    const errorTempHum = tempHumConfigs.filter(c => {
      const reading = readings.filter(r => r.id === c.id).pop();
      return reading && (now - reading.timestamp) < recentThreshold && !!reading.error;
    }).length;
    
    const activeLocations = locations.filter(loc => {
      const locConfigs = configs.filter(c => c.location === loc);
      return locConfigs.some(c => {
        const reading = readings.filter(r => r.id === c.id).pop();
        return reading && (now - reading.timestamp) < recentThreshold;
      });
    }).length;
    
    return {
      hasData,
      methane: { online: onlineMethane, error: errorMethane, total: methaneConfigs.length },
      tempHum: { online: onlineTempHum, error: errorTempHum, total: tempHumConfigs.length },
      esp32: { online: activeLocations, total: locations.length }
    };
  }, [configs, readings, now]);

  // Group configurations by Ward/Location
  const groupedConfigs = useMemo(() => getGroupedConfigs(configs), [configs]);

  // Identify Critical Methane Alerts
  const methaneAlerts = alerts.filter(a => !a.acknowledged && (a.message.includes('METHANE') || a.message.includes('Gas') || a.message.includes('ppm')));
  
  // Prioritize CRITICAL alerts in banner
  const criticalMethaneAlert = methaneAlerts.find(a => a.severity === 'CRITICAL');
  const warningMethaneAlert = methaneAlerts.find(a => a.severity === 'WARNING');
  const activeBannerAlert = criticalMethaneAlert || warningMethaneAlert;

  return (
    <div className="max-w-7xl mx-auto">
      
      {/* Warning Banner (Conditionally Rendered) */}
      {activeBannerAlert && (
         <div className={`mb-8 border-l-4 rounded-r-lg shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in
            ${activeBannerAlert.severity === 'CRITICAL' ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-neon-red' : 'bg-amber-50 border-amber-500 dark:bg-amber-900/20 dark:border-neon-amber'}
         `}>
           <div className="flex items-start gap-3">
             <AlertTriangle className={`w-6 h-6 mt-1 shrink-0 ${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-600 dark:text-neon-red' : 'text-amber-600 dark:text-neon-amber'}`} />
             <div>
               <h3 className={`font-bold text-lg ${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-800 dark:text-white uppercase' : 'text-amber-800 dark:text-white'}`}>
                 {activeBannerAlert.severity === 'CRITICAL' ? 'DANGER: Critical Methane Leak' : 'Warning: Elevated Methane Levels'}
               </h3>
               <p className={`${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-700 dark:text-red-200' : 'text-amber-700 dark:text-amber-200'} text-sm mt-1`}>
                 {activeBannerAlert.message}. Immediate inspection recommended.
               </p>
             </div>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className={`flex-1 sm:flex-none text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm
                  ${activeBannerAlert.severity === 'CRITICAL' ? 'bg-red-600 hover:bg-red-700 dark:bg-neon-red dark:hover:bg-red-600 dark:text-obsidian' : 'bg-amber-600 hover:bg-amber-700 dark:bg-neon-amber dark:hover:bg-amber-500 dark:text-obsidian'}
              `}>
                Acknowledge
              </button>
              <button className={`${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-700 dark:text-neon-red' : 'text-amber-700 dark:text-neon-amber'} font-semibold text-sm hover:underline whitespace-nowrap`}>
                View Details
              </button>
           </div>
         </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Column: Ward Monitoring */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Real-Time Environmental Monitoring</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Live sensor readings across all wards</p>
            </div>
            <div className="hidden sm:block">
               <button className="flex items-center gap-2 bg-white dark:bg-charcoal border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5">
                  All Wards <ChevronDown className="w-4 h-4" />
               </button>
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(groupedConfigs).sort().map(location => (
              <WardRow 
                key={location}
                location={location}
                configs={groupedConfigs[location]}
                readings={latestReadings}
                now={now}
              />
            ))}
          </div>
        </div>

        {/* Side Column: IoT Status & KPI */}
        <div className="lg:w-80 flex-shrink-0">
           <div className="bg-white dark:bg-charcoal/80 dark:backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-5 mb-6">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">IoT Sensor Status</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Active monitoring devices</p>
             
              <StatusCard 
                icon={Wind} 
                label="MQ-5 Sensors" 
                subLabel="Methane Detection" 
                countStr={`${sensorStatus.methane.online}/${sensorStatus.methane.total}`} 
                status={sensorStatus.methane.error > 0 ? 'Attention' : sensorStatus.methane.online > 0 ? 'Online' : 'Waiting'} 
                errorCount={sensorStatus.methane.error}
              />
              <StatusCard 
                icon={Thermometer} 
                label="DHT22 Sensors" 
                subLabel="Temp & Humidity" 
                countStr={`${sensorStatus.tempHum.online}/${sensorStatus.tempHum.total}`} 
                status={sensorStatus.tempHum.error > 0 ? 'Attention' : sensorStatus.tempHum.online > 0 ? 'Online' : 'Waiting'} 
                errorCount={sensorStatus.tempHum.error}
              />
              <StatusCard 
                icon={Cpu} 
                label="ESP32 Modules" 
                subLabel="Data Transmission" 
                countStr={`${sensorStatus.esp32.online}/${sensorStatus.esp32.total}`} 
                status={sensorStatus.esp32.online > 0 ? 'Active' : 'Waiting'} 
              />
             
             <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-500 dark:text-slate-400">Sensor Locations</span>
               </div>
               <div className="mt-2 space-y-1">
                 {Object.keys(groupedConfigs).map(loc => (
                   <div key={loc} className="flex justify-between text-xs">
                     <span className="text-slate-600 dark:text-slate-300 font-medium">{loc}</span>
                     <span className="text-slate-400 dark:text-slate-500">1 Room</span>
                   </div>
                 ))}
               </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};