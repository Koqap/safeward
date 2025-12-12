import React from 'react';
import { Alert } from '../types';
import { Bell, Check, Clock, AlertTriangle, Siren } from 'lucide-react';

interface AlertsViewProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onDismiss }) => {
  // Sort alerts: Active Critical > Active Warning > Acknowledged > Oldest
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a