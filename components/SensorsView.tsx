import React, { useState, useEffect, Suspense } from 'react';
import { SensorConfig, SensorReading } from '../types';
import { Activity, Wind, Thermometer, Droplets, CheckCircle, AlertTriangle, WifiOff, Box } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, OrbitControls, Environment } from '@react-three/drei';

interface SensorsViewProps {
  configs: SensorConfig[];
  readings: SensorReading[];
}

function Model(props: any) {
  const { scene } = useGLTF('/esp32.glb');
  return <primitive object={scene} {...props} />;
}

const SensorRow = ({ config, reading, status }: { config: SensorConfig, reading: SensorReading | undefined, status: string }) => {
  const Icon = ({ type }: { type: string }) => {
    if (type === 'METHANE') return <Wind className="w-4 h-4 text-purple-500" />;
    if (type === 'TEMPERATURE') return <Thermometer className="w-4 h-4 text-orange-500" />;
    if (type === 'HUMIDITY') return <Droplets className="w-4 h-4 text-blue-500" />;
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white dark:bg-charcoal rounded-md shadow-sm">
          <Icon type={config.type} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{config.type}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{config.id}</p>
        </div>
      </div>
      
      <div className="text-right">
        <p className="text-lg font-bold text-slate-800 dark:text-white">
          {reading ? reading.value.toFixed(1) : '--'}
          <span className="text-xs text-slate-500 ml-1 font-normal">{config.unit}</span>
        </p>
        <div className="flex justify-end mt-1">
          {status === 'offline' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400">
                <WifiOff className="w-2.5 h-2.5" /> Offline
              </span>
          ) : status === 'safe' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-neon-green">
              <CheckCircle className="w-2.5 h-2.5" /> OK
            </span>
          ) : status === 'warning' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-neon-amber">
              <AlertTriangle className="w-2.5 h-2.5" /> Warn
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-neon-red">
              <AlertTriangle className="w-2.5 h-2.5" /> Crit
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const SensorsView: React.FC<SensorsViewProps> = ({ configs, readings }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getLatestReading = (id: string) => {
    return readings.filter(r => r.id === id).pop();
  };

  const getStatus = (reading: SensorReading | undefined, config: SensorConfig) => {
    if (!reading) return 'offline';
    
    // Check if data is stale (> 15 seconds)
    if (currentTime - reading.timestamp > 15000) return 'offline';

    if (config.type === 'METHANE') {
       if (reading.value > config.warningThreshold * 1.2) return 'critical';
       if (reading.value >= config.warningThreshold) return 'warning';
       return 'safe';
    }
    if (reading.value > config.warningThreshold) return 'warning';
    return 'safe';
  };

  // Group configs by location
  const wards = ['Ward A', 'Ward B', 'Ward C'];
  const groupedConfigs = wards.reduce((acc, ward) => {
    acc[ward] = configs.filter(c => c.location === ward);
    return acc;
  }, {} as Record<string, SensorConfig[]>);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Sensor Network Status</h2>
          <p className="text-slate-500 dark:text-slate-400">Real-time 3D visualization of IoT nodes per ward</p>
        </div>
        <div className="bg-white dark:bg-charcoal px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300">
          Total Nodes: {configs.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {wards.map(ward => {
          const wardConfigs = groupedConfigs[ward] || [];
          // Determine overall ward status based on worst sensor status
          const wardStatus = wardConfigs.reduce((acc, config) => {
            const reading = getLatestReading(config.id);
            const status = getStatus(reading, config);
            if (status === 'critical') return 'critical';
            if (status === 'warning' && acc !== 'critical') return 'warning';
            if (status === 'offline' && acc === 'safe') return 'offline'; // Only override safe
            return acc;
          }, 'safe');

          const statusColor = 
            wardStatus === 'critical' ? 'border-red-500 shadow-[0_0_20px_rgba(255,0,60,0.3)]' :
            wardStatus === 'warning' ? 'border-amber-500 shadow-[0_0_20px_rgba(255,204,0,0.3)]' :
            wardStatus === 'offline' ? 'border-slate-400' :
            'border-emerald-500 shadow-[0_0_20px_rgba(102,252,241,0.2)]';

          return (
            <div key={ward} className={`bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-2xl border-2 ${statusColor} overflow-hidden transition-all duration-500`}>
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Box className="w-5 h-5 text-slate-400" />
                  {ward}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  wardStatus === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-neon-red' :
                  wardStatus === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-neon-amber' :
                  wardStatus === 'offline' ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400' :
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-neon-green'
                }`}>
                  {wardStatus}
                </span>
              </div>

              {/* 3D Model Container */}
              <div className="h-48 bg-gradient-to-b from-slate-100 to-white dark:from-charcoal dark:to-obsidian relative">
                 <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-slate-400">Loading 3D Model...</div>}>
                    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 50 }}>
                      <Stage environment="city" intensity={0.6}>
                        <Model scale={0.5} rotation={[-Math.PI / 2, 0, 0]} />
                      </Stage>
                      <OrbitControls autoRotate autoRotateSpeed={4} enableZoom={false} />
                    </Canvas>
                 </Suspense>
                 {/* Overlay Status */}
                 <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-mono bg-white/80 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                    ESP32-WROOM-32
                 </div>
              </div>

              {/* Sensor List */}
              <div className="p-4 space-y-3">
                {wardConfigs.length > 0 ? (
                  wardConfigs.map(config => (
                    <SensorRow 
                      key={config.id} 
                      config={config} 
                      reading={getLatestReading(config.id)} 
                      status={getStatus(getLatestReading(config.id), config)} 
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                    No sensors configured
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};