import React from 'react';
import { Alert } from '../types';
import { Bell, Check, Clock, AlertTriangle, Siren, CheckCircle } from 'lucide-react';

interface AlertsViewProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onDismiss }) => {
  // Sort alerts: Active Critical > Active Warning > Acknowledged > Oldest
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    if (a.severity !== b.severity) return a.severity === 'CRITICAL' ? -1 : 1;
    return b.timestamp - a.timestamp;
  });

  const activeAlerts = sortedAlerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = sortedAlerts.filter(a => a.acknowledged);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const getTimeSince = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Alert Center</h2>
          <p className="text-slate-500 dark:text-slate-400">Real-time safety alerts from ESP32 sensors</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-neon-red px-3 py-1 rounded-full text-sm font-semibold">
            {activeAlerts.filter(a => a.severity === 'CRITICAL').length} Critical
          </span>
          <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-neon-amber px-3 py-1 rounded-full text-sm font-semibold">
            {activeAlerts.filter(a => a.severity === 'WARNING').length} Warnings
          </span>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Alerts</h3>
          {activeAlerts.map(alert => (
            <div 
              key={alert.id}
              className={`rounded-xl border p-4 flex items-start justify-between gap-4 backdrop-blur-sm ${
                alert.severity === 'CRITICAL' 
                  ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-neon-red/50 dark:shadow-[0_0_15px_rgba(255,0,60,0.15)]' 
                  : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-neon-amber/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  alert.severity === 'CRITICAL' 
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-neon-red' 
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-neon-amber'
                }`}>
                  {alert.severity === 'CRITICAL' ? (
                    <Siren className="w-5 h-5 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${
                    alert.severity === 'CRITICAL' ? 'text-red-800 dark:text-white' : 'text-amber-800 dark:text-white'
                  }`}>
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{getTimeSince(alert.timestamp)}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{formatTime(alert.timestamp)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-red-600 hover:bg-red-700 text-white dark:bg-neon-red dark:text-obsidian dark:hover:bg-red-600'
                    : 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-neon-amber dark:text-obsidian dark:hover:bg-amber-500'
                }`}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/10 dark:border-neon-green/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-neon-green" />
          </div>
          <h3 className="text-lg font-bold text-emerald-800 dark:text-white">All Clear</h3>
          <p className="text-emerald-600 dark:text-emerald-400 mt-1">No active alerts. All sensors are within safe parameters.</p>
        </div>
      )}

      {/* Acknowledged Alerts History */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">History</h3>
          <div className="bg-white dark:bg-charcoal/50 dark:backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
            {acknowledgedAlerts.slice(0, 10).map(alert => (
              <div key={alert.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-through opacity-75">{alert.message}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{formatTime(alert.timestamp)}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  alert.severity === 'CRITICAL' 
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' 
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};