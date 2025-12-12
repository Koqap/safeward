import React, { useMemo } from 'react';
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
}> = ({ location, configs, readings }) => {
  
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

  // Determine container styling based on worst state
  const statusColor = isCritical 
    ? 'bg-red-50 border-red-200' 
    : isWarning 
      ? 'bg-amber-50 border-amber-200' 
      : 'bg-emerald-50 border-emerald-200';

  const decorativeBarColor = isCritical
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  return (
    <div className={`rounded-xl border ${statusColor} p-5 transition-all mb-4 relative overflow-hidden`}>
      {/* Decorative colored bar on left */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${decorativeBarColor}`} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-2">
        
        {/* Header Section */}
        <div className="flex-shrink-0 min-w-[200px]">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-100 text-red-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isCritical ? <Siren className="w-6 h-6 animate-pulse" /> : isWarning ? <Wind className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
             </div>
             <div>
               <h3 className="font-bold text-slate-800 text-lg">{location}</h3>
               {/* Mock Room Number logic for display */}
               <p className="text-xs text-slate-500 font-medium">Room {location === 'Ward A' ? '101' : location === 'Ward B' ? '204' : '305'}</p>
               <p className="text-xs text-slate-400 mt-0.5">MQ-5 Sensor #{methane?.config?.id.split('-')[1].toUpperCase() || '00'}</p>
             </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8">
           {/* Methane */}
           <div>
             <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Methane Level</p>
             <div className={`text-2xl font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
               {methane?.data ? Math.round(methane.data.value) : '--'} 
               <span className="text-sm font-medium ml-1 text-slate-500">ppm</span>
             </div>
           </div>

           {/* Temperature */}
           <div>
             <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Temperature</p>
             <div className="text-2xl font-bold text-slate-700">
               {temp?.data ? temp.data.value.toFixed(1) : '--'}
               <span className="text-sm font-medium ml-1 text-slate-500">°C</span>
             </div>
           </div>

           {/* Humidity */}
           <div className="hidden md:block">
             <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Humidity</p>
             <div className="text-2xl font-bold text-slate-700">
               {hum?.data ? Math.round(hum.data.value) : '--'}
               <span className="text-sm font-medium ml-1 text-slate-500">%</span>
             </div>
           </div>
        </div>

        {/* Status Pill */}
        <div className="self-start md:self-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide 
            ${isCritical ? 'bg-red-100 text-red-700 animate-pulse' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isCritical ? 'CRITICAL LEAK' : isWarning ? 'Warning' : 'Safe'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Side Panel Status Card
const StatusCard: React.FC<{
  icon: React.ElementType;
  label: string;
  subLabel: string;
  countStr: string;
  status: 'Online' | 'Active' | 'Offline';
}> = ({ icon: Icon, label, subLabel, countStr, status }) => (
  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between mb-3">
     <div className="flex items-center gap-3">
        <div className="bg-emerald-500 p-2 rounded-lg text-white">
           <Icon className="w-5 h-5" />
        </div>
        <div>
           <p className="font-bold text-slate-800 text-sm">{label}</p>
           <p className="text-xs text-slate-500">{subLabel}</p>
        </div>
     </div>
     <div className="text-right">
        <p className="text-lg font-bold text-emerald-700 leading-tight">{countStr}</p>
        <p className="text-[10px] text-emerald-600 font-medium">{status}</p>
     </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ configs, readings, alerts }) => {
  // Get latest readings for all sensors
  const latestReadings = useMemo(() => {
    const latest: SensorReading[] = [];
    configs.forEach(c => {
      const reading = readings.filter(r => r.id === c.id).pop();
      if (reading) latest.push(reading);
    });
    return latest;
  }, [readings, configs]);

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
            ${activeBannerAlert.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}
         `}>
           <div className="flex items-start gap-3">
             <AlertTriangle className={`w-6 h-6 mt-1 shrink-0 ${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`} />
             <div>
               <h3 className={`font-bold text-lg ${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-800 uppercase' : 'text-amber-800'}`}>
                 {activeBannerAlert.severity === 'CRITICAL' ? 'DANGER: Critical Methane Leak' : 'Warning: Elevated Methane Levels'}
               </h3>
               <p className={`${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'} text-sm mt-1`}>
                 {activeBannerAlert.message}. Immediate inspection recommended.
               </p>
             </div>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className={`flex-1 sm:flex-none text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm
                  ${activeBannerAlert.severity === 'CRITICAL' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}
              `}>
                Acknowledge
              </button>
              <button className={`${activeBannerAlert.severity === 'CRITICAL' ? 'text-red-700' : 'text-amber-700'} font-semibold text-sm hover:underline whitespace-nowrap`}>
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
              <h2 className="text-xl font-bold text-slate-800">Real-Time Environmental Monitoring</h2>
              <p className="text-sm text-slate-500 mt-1">Live sensor readings across all wards</p>
            </div>
            <div className="hidden sm:block">
               <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50">
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
              />
            ))}
          </div>
        </div>

        {/* Side Column: IoT Status & KPI */}
        <div className="lg:w-80 flex-shrink-0">
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
             <h3 className="font-bold text-slate-800 text-lg mb-1">IoT Sensor Status</h3>
             <p className="text-xs text-slate-500 mb-4">Active monitoring devices</p>
             
             <StatusCard 
               icon={Wind} 
               label="MQ-5 Sensors" 
               subLabel="Methane Detection" 
               countStr="3/3" 
               status="Online" 
             />
             <StatusCard 
               icon={Thermometer} 
               label="DHT22 Sensors" 
               subLabel="Temp & Humidity" 
               countStr="6/6" 
               status="Online" 
             />
             <StatusCard 
               icon={Cpu} 
               label="ESP32 Modules" 
               subLabel="Data Transmission" 
               countStr="3/3" 
               status="Active" 
             />
             
             <div className="mt-4 pt-4 border-t border-slate-100">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-slate-500">Sensor Locations</span>
               </div>
               <div className="mt-2 space-y-1">
                 {Object.keys(groupedConfigs).map(loc => (
                   <div key={loc} className="flex justify-between text-xs">
                     <span className="text-slate-600 font-medium">{loc}</span>
                     <span className="text-slate-400">1 Room</span>
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