import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Activity, FileText, Settings, Bell, Menu, X, BarChart2, Shield, Search, HelpCircle, ChevronDown, Sun, Moon } from 'lucide-react';
import { ViewState, SensorReading, Alert } from './types';
import { SENSOR_CONFIGS, HISTORY_LIMIT, OFFLINE_THRESHOLD_MS } from './constants';
import { Dashboard } from './components/Dashboard';
import { AIAnalysis } from './components/AIAnalysis';
import { SensorsView } from './components/SensorsView';
import { AlertsView } from './components/AlertsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiSensorData {
  device_id: string;
  location: string;
  methane: number;
  temperature: number;
  humidity: number;
  timestamp: number;
  error?: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Request Notification Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Play Siren Sound
  const playAlertSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Siren effect: Low to High frequency sweep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }, []);

  // Convert API data to SensorReading format
  const convertApiDataToReadings = useCallback((apiData: ApiSensorData[]): SensorReading[] => {
    const newReadings: SensorReading[] = [];
    
    apiData.forEach(data => {
      // Find matching configs for this location
      const locationConfigs = SENSOR_CONFIGS.filter(c => c.location === data.location);
      
      locationConfigs.forEach(config => {
        let value = 0;
        if (config.type === 'METHANE') value = data.methane;
        else if (config.type === 'TEMPERATURE') value = data.temperature;
        else if (config.type === 'HUMIDITY') value = data.humidity;
        
        newReadings.push({
          id: config.id,
          type: config.type,
          value: Number(value.toFixed(1)),
          unit: config.unit,
          timestamp: data.timestamp,
          location: data.location,
          error: data.error
        });
      });
    });
    
    return newReadings;
  }, []);

  // Check thresholds and create alerts
  const checkThresholds = useCallback((newReadings: SensorReading[]) => {
    const now = Date.now();
    
    const generatedAlerts: Alert[] = [];
    
    newReadings.forEach(reading => {
      const config = SENSOR_CONFIGS.find(c => c.id === reading.id);
      if (!config) return;

      let severity: 'WARNING' | 'CRITICAL' | null = null;
      let message = '';

      if (config.type === 'METHANE') {
        // Critical: > 20% above warning threshold (Hospital Protocol)
        if (reading.value > (config.warningThreshold * 1.2)) {
           severity = 'CRITICAL';
           message = `CRITICAL METHANE LEAK at ${config.location}: ${reading.value}${config.unit}`;
        } else if (reading.value >= config.warningThreshold) {
           severity = 'WARNING';
           message = `Elevated Methane levels at ${config.location}: ${reading.value}${config.unit}`;
        }
      } else {
         // General logic for other sensors
         if (reading.value > config.warningThreshold) {
           const isCritical = reading.value > (config.warningThreshold * 1.2);
           severity = isCritical ? 'CRITICAL' : 'WARNING';
           message = `${config.type} High at ${config.location}: ${reading.value}${config.unit}`;
         }
      }

      if (severity) {
        // Create alert object
        const newAlert: Alert = {
          id: `${reading.id}-${now}`, 
          sensorId: reading.id,
          // location removed as it is not in Alert interface
          message,
          timestamp: now,
          severity,
          acknowledged: false
        };
        
        generatedAlerts.push(newAlert);

        // HOSPITAL PROTOCOL:
        // WARNING = Visual Only (Yellow) - No Sound, No Pop-up
        // CRITICAL = Siren + Pop-up Notification
        if (severity === 'CRITICAL') {
           playAlertSound();
           if ('Notification' in window && Notification.permission === 'granted') {
             // Use a tag to prevent spamming notifications for the same alert
             new Notification('CRITICAL ALERT', {
               body: message,
               icon: '/vite.svg',
               tag: reading.id 
             });
           }
        }
      }
    });
    
    // Update alerts state with new alerts, avoiding duplicates
    if (generatedAlerts.length > 0) {
      setAlerts(prev => {
        const uniqueAlerts = [...prev];
        generatedAlerts.forEach(newAlert => {
           // Only add if we don't have a recent unacknowledged alert for this sensor
           const exists = uniqueAlerts.some(a => 
             a.sensorId === newAlert.sensorId && 
             !a.acknowledged && 
             (newAlert.timestamp - a.timestamp < 10000)
           );
           if (!exists) {
             uniqueAlerts.push(newAlert);
           }
        });
        return uniqueAlerts.sort((a, b) => b.timestamp - a.timestamp);
      });
    }
  }, [playAlertSound]);

  // Fetch data from API
  const fetchSensorData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/readings?limit=100`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Only set connected if there are actual readings from ESP32 AND they are recent
        if (data.readings && data.readings.length > 0) {
          const newReadings = convertApiDataToReadings(data.readings);
          
          // Check if the latest reading is recent enough
          const latestReading = newReadings.sort((a, b) => b.timestamp - a.timestamp)[0];
          const now = Date.now();
          const isRecent = latestReading && (now - latestReading.timestamp < OFFLINE_THRESHOLD_MS);

          setIsConnected(!!isRecent);
          
          setReadings(prev => {
            const next = [...prev, ...newReadings];
            // Deduplicate by id and timestamp
            const seen = new Set<string>();
            const unique = next.filter(r => {
              const key = `${r.id}-${r.timestamp}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            return unique.sort((a, b) => a.timestamp - b.timestamp).slice(-HISTORY_LIMIT * SENSOR_CONFIGS.length);
          });
          
          // Check thresholds for ALL new readings to ensure history is captured
          // This ensures that if you load the page and there was a critical event 5 mins ago, you see it.
          checkThresholds(newReadings);
        } else {
          // No readings yet - ESP32 hasn't sent data
          setIsConnected(false);
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.log('API not available, waiting for ESP32 data...');
      setIsConnected(false);
    }
  }, [convertApiDataToReadings, checkThresholds]);

  // Poll API for sensor data
  useEffect(() => {
    // Initial fetch
    fetchSensorData();
    
    // Set up polling interval
    const interval = setInterval(fetchSensorData, 2000);

    return () => clearInterval(interval);
  }, [fetchSensorData]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'SENSORS', label: 'Sensors', icon: Activity }, 
    { id: 'ALERTS', label: 'Alerts', icon: Bell },       
    { id: 'AI_ANALYSIS', label: 'AI Insights', icon: FileText }, 
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart2 }, 
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${darkMode ? 'bg-obsidian text-slate-300' : 'bg-slate-50 text-slate-800'} font-sans selection:bg-neon-blue selection:text-obsidian`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 border-r shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out flex flex-col
        ${darkMode ? 'glass border-white/5' : 'bg-white border-slate-200'}
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        <div className={`h-20 flex items-center px-8 border-b ${darkMode ? 'border-white/5' : 'border-slate-100 bg-gradient-to-r from-white to-slate-50'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-cyan-600 rounded-xl flex items-center justify-center mr-3 text-white shadow-lg shadow-neon-blue/20">
             <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className={`block text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>SafeWard</span>
            <span className={`text-xs font-medium tracking-wide uppercase ${darkMode ? 'text-neon-blue' : 'text-slate-500'}`}>IoT Monitoring</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Menu</div>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as ViewState);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${currentView === item.id 
                  ? (darkMode ? 'bg-neon-blue/10 text-neon-blue shadow-[0_0_10px_rgba(69,162,158,0.2)]' : 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100') 
                  : (darkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1')}
              `}
            >
              <item.icon className={`w-5 h-5 transition-colors ${currentView === item.id ? (darkMode ? 'text-neon-blue' : 'text-blue-600') : 'text-slate-400 group-hover:text-slate-500'}`} />
              {item.label}
              {currentView === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile Section (Bottom Sidebar) */}
        <div className={`p-6 border-t ${darkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${darkMode ? 'bg-charcoal border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
               <img src="https://ui-avatars.com/api/?name=Sarah+Chen&background=0D8ABC&color=fff" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
               <p className={`text-sm font-bold truncate transition-colors ${darkMode ? 'text-slate-200 group-hover:text-neon-blue' : 'text-slate-700 group-hover:text-blue-700'}`}>Dr. Sarah Chen</p>
               <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative ${darkMode ? 'bg-obsidian' : 'bg-slate-50'}`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        {/* Top Header */}
        <header className={`h-20 backdrop-blur-md border-b flex items-center justify-between px-8 sticky top-0 z-20 ${darkMode ? 'bg-obsidian/80 border-white/5' : 'bg-white/80 border-slate-200/60'}`}>
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {navItems.find(i => i.id === currentView)?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block font-medium mt-0.5">
                {currentView === 'DASHBOARD' ? 'Real-time hospital safety overview' : 'Manage system preferences'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Operational Status Pill */}
             <div className={`hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-sm transition-all duration-300 ${
               isConnected 
                 ? (darkMode ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue' : 'bg-emerald-50/50 border-emerald-200/60 text-emerald-700') 
                 : (darkMode ? 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber' : 'bg-amber-50/50 border-amber-200/60 text-amber-700')
             }`}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? (darkMode ? 'bg-neon-blue' : 'bg-emerald-400') : (darkMode ? 'bg-neon-amber' : 'bg-amber-400')
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isConnected ? (darkMode ? 'bg-neon-blue' : 'bg-emerald-500') : (darkMode ? 'bg-neon-amber' : 'bg-amber-500')
                  }`}></span>
                </span>
                <span className="text-xs font-bold tracking-wide">
                  {isConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                </span>
             </div>

             <div className={`h-8 w-px mx-2 hidden md:block ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>

             <button 
               onClick={() => setDarkMode(!darkMode)}
               className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${darkMode ? 'text-slate-400 hover:text-neon-amber hover:bg-white/5' : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}
             >
               {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             <button className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${darkMode ? 'text-slate-400 hover:text-neon-blue hover:bg-white/5' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
               <Search className="w-5 h-5" />
             </button>

            <button className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all ${darkMode ? 'text-slate-400 hover:text-neon-blue hover:bg-white/5' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
              <Bell className="w-5 h-5" />
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <span className="absolute top-2 right-2 flex h-3 w-3 items-center justify-center rounded-full bg-neon-red ring-2 ring-obsidian">
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative z-10">
           <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
             {currentView === 'DASHBOARD' && (
                <Dashboard 
                  configs={SENSOR_CONFIGS} 
                  readings={readings} 
                  alerts={alerts} 
                />
             )}
             {currentView === 'SENSORS' && (
                <SensorsView configs={SENSOR_CONFIGS} readings={readings} />
             )}
             {currentView === 'ALERTS' && (
                <AlertsView alerts={alerts} onDismiss={dismissAlert} />
             )}
             {currentView === 'AI_ANALYSIS' && (
                <AIAnalysis readings={readings} alerts={alerts} />
             )}
             {currentView === 'ANALYTICS' && (
                <AnalyticsView configs={SENSOR_CONFIGS} readings={readings} alerts={alerts} />
             )}
             {currentView === 'SETTINGS' && (
                <SettingsView configs={SENSOR_CONFIGS} isConnected={isConnected} />
             )}
           </div>
        </div>
        
        {/* Help Bubble (Visual only) */}
        <button className="fixed bottom-8 right-8 bg-gradient-to-r from-neon-blue to-cyan-600 hover:from-cyan-500 hover:to-neon-blue text-obsidian rounded-full p-4 shadow-[0_0_20px_rgba(69,162,158,0.4)] transition-all hover:scale-110 hover:-translate-y-1 z-40 group">
           <HelpCircle className="w-6 h-6" />
           <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
             Need Help?
           </span>
        </button>

        {/* Critical Alerts Toast (Bottom Center for better visibility) */}
        {alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL').length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 animate-slide-up">
             <div className="bg-white dark:bg-charcoal border-l-4 border-red-500 rounded-xl shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between overflow-hidden">
                <div className="absolute inset-0 bg-red-50/50 dark:bg-red-900/10 -z-10" />
                <div className="flex items-center gap-3 p-3 md:p-4">
                   <div className="p-2 md:p-3 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 rounded-lg animate-pulse shrink-0">
                      <Activity className="w-5 h-5 md:w-6 md:h-6" />
                   </div>
                   <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white text-sm md:text-lg">Critical Alert Active</p>
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium line-clamp-2">
                        {alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL')[0].message}
                      </p>
                   </div>
                </div>
                <div className="p-3 pt-0 md:p-4 md:pl-0">
                  <button 
                    onClick={() => dismissAlert(alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL')[0].id)}
                    className="w-full md:w-auto bg-red-600 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-95"
                  >
                    Dismiss
                  </button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;