import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { DashboardPage } from './DashboardPage';
import { DeciderDashboard } from './DeciderDashboard';

export const DashboardRouter: React.FC = () => {
  const role = useAuthStore(s => s.user?.role.name);
  if (role === 'DECIDER') return <DeciderDashboard />;
  return <DashboardPage />;
};
