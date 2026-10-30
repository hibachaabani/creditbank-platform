import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, BarChart3, Settings, LogOut, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import type { Role } from '../../types';

const navItems: { to: string; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { to: '/dashboard',         label: 'Tableau de bord', icon: <LayoutDashboard size={18} />, roles: ['CLIENT','AGENT','ANALYST','DECIDER','ADMIN'] },
  { to: '/dossiers',          label: 'Dossiers',         icon: <FileText size={18} />,        roles: ['CLIENT','AGENT','ANALYST','DECIDER','ADMIN'] },
  { to: '/dossiers/nouveau',  label: 'Nouvelle demande', icon: <FileText size={18} />,        roles: ['CLIENT','AGENT'] },
  { to: '/utilisateurs',      label: 'Utilisateurs',     icon: <Users size={18} />,           roles: ['ADMIN'] },
  { to: '/rapports',          label: 'Rapports',         icon: <BarChart3 size={18} />,       roles: ['DECIDER','ADMIN'] },
  { to: '/profil',            label: 'Mon profil',       icon: <Settings size={18} />,        roles: ['CLIENT','AGENT','ANALYST','DECIDER','ADMIN'] },
];

export const Sidebar: React.FC = () => {
  const { user, refreshToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role.name as Role;

  const handleLogout = async () => {
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const filtered = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
          <Building2 size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">CréditBank</p>
          <p className="text-slate-400 text-xs mt-0.5">Gestion des crédits</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filtered.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {user?.firstName[0]}{user?.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-400 text-xs">{role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};
