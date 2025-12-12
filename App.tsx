import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Activity, FileText, Settings, Bell, Menu, X, BarChart2, Shield, Search, HelpCircle, ChevronDown } from 'lucide-react';
import { ViewState, SensorReading, Alert } from './types';
import { SENSOR_CONFIGS, MOCK_HISTORY_LENGTH } from './constants';
import { Dashboard } from './components/Dashboard';
import { AIAnalysis } from './components/AIAnalysis';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Mock Data Generation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newReadings: SensorReading[] = SENSOR_CONFIGS.map(config => {
        // Base value + random noise
        let baseValue = (config.safeRange[0] + config.safeRange[1]) / 2;
        let noise = (Math.random() - 0.5) * 5;
        
        // Simulate occasional spikes for Methane to demonstrate Critical alerts
        // Threshold is 800. Critical is 960 (800 * 1.2).
        if (config.type === 'METHANE' && Math.random() > 0.90) {
           noise += (Math.random() * 900); // Can spike up to ~1150
        }
        // Simulate Temp fluctuation
        if (config.type === 'TEMPERATURE') {
           noise = (Math.sin(now / 10000) * 3) + (Math.random() - 0.5);
        }

        let val = baseValue + noise;
        val = Math.max(0, Number(val.toFixed(1)));

        return {
          id: config.id,
          type: config.type,
          value: val,
          unit: config.unit,
          timestamp: now,
          location: config.location
        };
      });

      setReadings(prev => {
        const next = [...prev, ...newReadings];
        return next.slice(-MOCK_HISTORY_LENGTH * SENSOR_CONFIGS.length);
      });

      // Check Thresholds with specific Methane logic
      newReadings.forEach(reading => {
        const config = SENSOR_CONFIGS.find(c => c.id === reading.id);
        if (!config) return;

        let severity: 'WARNING' | 'CRITICAL' | null = null;
        let message = '';

        if (config.type === 'METHANE') {
          // Critical: > 20% above warning threshold
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
          const newAlert: Alert = {
            id: `${reading.id}-${now}`,
            sensorId: reading.id,
            message: message,
            severity: severity,
            timestamp: now,
            acknowledged: false
          };
          
          // Avoid duplicate alerts in short timeframe
          setAlerts(prev => {
            const lastAlert = prev.filter(a => a.sensorId === reading.id).pop();
            // Debounce alert if it's recent (10s) and not acknowledged
            if (lastAlert && (now - lastAlert.timestamp < 10000) && !lastAlert.acknowledged) {
              return prev;
            }
            return [...prev, newAlert];
          });
        }
      });

    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-white">
             <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-lg font-bold text-slate-800 leading-none">SafeWard</span>
            <span className="text-xs text-slate-500 font-medium">IoT Monitoring</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                // Only Dashboard and AI Analysis are fully implemented in this demo
                if (item.id === 'DASHBOARD' || item.id === 'AI_ANALYSIS') {
                   setCurrentView(item.id as ViewState);
                }
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${currentView === item.id 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User Profile Section (Bottom Sidebar) */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-slate-200">
               <img src="https://ui-avatars.com/api/?name=Sarah+Chen&background=0D8ABC&color=fff" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold text-slate-700 truncate">Dr. Sarah Chen</p>
               <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Environmental Monitoring
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Real-time hospital safety dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Operational Status Pill */}
             <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-emerald-700">All Systems Operational</span>
             </div>

             <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

             <button className="text-slate-400 hover:text-slate-600 transition-colors">
               <Search className="w-5 h-5" />
             </button>

            <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold border-2 border-white">
                   {alerts.filter(a => !a.acknowledged).length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
           {currentView === 'DASHBOARD' && (
             <Dashboard 
               configs={SENSOR_CONFIGS} 
               readings={readings} 
               alerts={alerts} 
             />
           )}
           {currentView === 'AI_ANALYSIS' && (
             <AIAnalysis readings={readings} alerts={alerts} />
           )}
           {(currentView !== 'DASHBOARD' && currentView !== 'AI_ANALYSIS') && (
             <div className="flex flex-col items-center justify-center h-full text-center">
               <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                 <Activity className="w-10 h-10 text-slate-300" />
               </div>
               <h3 className="text-xl font-bold text-slate-800">Module Under Development</h3>
               <p className="text-slate-500 mt-2 max-w-sm">
                 The {navItems.find(n => n.id === currentView)?.label} module is currently being integrated with the sensor network.
               </p>
             </div>
           )}
        </div>
        
        {/* Help Bubble (Visual only) */}
        <button className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-transform hover:scale-105 flex items-center gap-2 pr-5">
           <HelpCircle className="w-5 h-5" />
           <span className="text-sm font-semibold">Help</span>
        </button>

        {/* Critical Alerts Toast (Bottom Center for better visibility) */}
        {alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL').length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-full max-w-lg px-4">
             <div className="bg-red-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white/20 rounded-lg">
                      <Activity className="w-6 h-6 animate-pulse" />
                   </div>
                   <div>
                      <p className="font-bold">Critical Alert Active</p>
                      <p className="text-sm text-red-100">
                        {alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL')[0].message}
                      </p>
                   </div>
                </div>
                <button 
                  onClick={() => dismissAlert(alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL')[0].id)}
                  className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap hover:bg-red-50"
                >
                  Dismiss
                </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;