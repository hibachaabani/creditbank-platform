import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';

const schema = z.object({
  firstName:   z.string().min(2, 'Prénom requis'),
  lastName:    z.string().min(2, 'Nom requis'),
  email:       z.string().email('Email invalide'),
  password:    z.string().min(6, 'Minimum 6 caractères'),
  phone:       z.string().optional(),
  nationalId:  z.string().optional(),
  roleId:      z.string().min(1, 'Veuillez choisir un rôle'),
  agencyId:    z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Role     { id: string; name: string; description?: string }
interface Agency   { id: string; name: string; city: string }

const roleLabels: Record<string, string> = {
  CLIENT:  '👤 Client — Je souhaite demander un crédit',
  AGENT:   '🏢 Agent — Conseiller bancaire en agence',
  ANALYST: '🔍 Analyste — Analyste crédit',
  DECIDER: '✅ Décideur — Responsable crédit',
  ADMIN:   '⚙️ Admin — Administrateur système',
};

export const RegisterPage: React.FC = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedRoleId = watch('roleId');
  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const needsAgency = selectedRole && ['AGENT', 'ANALYST'].includes(selectedRole.name);

  // Charger les rôles et agences
  useEffect(() => {
    api.get('/auth/roles').then(r => {
      setRoles(r.data.roles);
      setAgencies(r.data.agencies);
    });
  }, []);

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload: any = { ...data };
      if (!payload.agencyId) delete payload.agencyId;
      if (!payload.phone) delete payload.phone;
      if (!payload.nationalId) delete payload.nationalId;

      const res = await authService.register(payload);
      setAuth(res.user, res.accessToken, res.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500 rounded-2xl mb-3">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CréditBank</h1>
          <p className="text-slate-400 mt-1 text-sm">Créer un nouveau compte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom" placeholder="Prénom" error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Nom" placeholder="Nom de famille" error={errors.lastName?.message} {...register('lastName')} />
            </div>

            <Input label="Adresse email" type="email" placeholder="votre@email.com" error={errors.email?.message} {...register('email')} />
            <Input label="Mot de passe" type="password" placeholder="Minimum 6 caractères" error={errors.password?.message} {...register('password')} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Téléphone (optionnel)" placeholder="+216 XX XXX XXX" {...register('phone')} />
              <Input label="N° National (optionnel)" placeholder="N° CIN" {...register('nationalId')} />
            </div>

            {/* Sélection du rôle */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Votre rôle *</label>
              {roles.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-3 border rounded-lg">Chargement...</div>
              ) : (
                <div className="space-y-2">
                  {roles.map(role => (
                    <label key={role.id}
                      className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedRoleId === role.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <input type="radio" value={role.id} {...register('roleId')} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        selectedRoleId === role.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`} />
                      <span className="text-sm">{roleLabels[role.name] ?? role.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {errors.roleId && <p className="text-xs text-red-500 mt-1">{errors.roleId.message}</p>}
            </div>

            {/* Agence si nécessaire */}
            {needsAgency && agencies.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Agence</label>
                <select {...register('agencyId')}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none">
                  <option value="">— Sélectionner une agence —</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>{a.name} — {a.city}</option>
                  ))}
                </select>
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
