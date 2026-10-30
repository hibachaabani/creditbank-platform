import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, Shield, Building2, Calendar } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const roleLabels: Record<string, string> = {
  CLIENT: 'Client', AGENT: 'Agent bancaire', ANALYST: 'Analyste crédit',
  DECIDER: 'Responsable crédit', ADMIN: 'Administrateur',
};

const roleColors: Record<string, string> = {
  CLIENT: 'bg-blue-100 text-blue-700', AGENT: 'bg-green-100 text-green-700',
  ANALYST: 'bg-orange-100 text-orange-700', DECIDER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
};

export const ProfilePage: React.FC = () => {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  const role = user?.role.name ?? '';

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles</p>
      </div>

      {/* Avatar + infos principales */}
      <Card>
        <div className="p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${roleColors[role] ?? 'bg-gray-100 text-gray-600'}`}>
                <Shield size={11} className="mr-1" />
                {roleLabels[role] ?? role}
              </span>
              {user.agency && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  <Building2 size={11} className="mr-1" />
                  {user.agency.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Informations détaillées */}
      <Card>
        <CardHeader title="Informations du compte" />
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Email', value: user.email, icon: <Mail size={16} /> },
            { label: 'Téléphone', value: user.phone ?? '—', icon: <Phone size={16} /> },
            { label: 'Rôle', value: roleLabels[role] ?? role, icon: <Shield size={16} /> },
            { label: 'Agence', value: user.agency?.name ?? '—', icon: <Building2 size={16} /> },
            { label: 'Membre depuis', value: new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), icon: <Calendar size={16} /> },
            { label: 'Statut', value: user.isActive ? '✅ Actif' : '❌ Inactif', icon: <User size={16} /> },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}</div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
      )}
    </div>
  );
};
