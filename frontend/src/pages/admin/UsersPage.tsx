import React, { useEffect, useState } from 'react';
import { Search, UserCheck, UserX, Users } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  role: { name: string };
  agency?: { name: string; city: string } | null;
}

const roleColors: Record<string, string> = {
  CLIENT: 'bg-blue-100 text-blue-700', AGENT: 'bg-green-100 text-green-700',
  ANALYST: 'bg-orange-100 text-orange-700', DECIDER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
};

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
      setFiltered(res.data);
    } catch {
      // fallback vide
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.role.name.toLowerCase().includes(q)
    ));
  }, [search, users]);

  const toggleActive = async (id: string, current: boolean) => {
    await api.put(`/auth/users/${id}`, { isActive: !current });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-gray-500 mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats par rôle */}
      <div className="grid grid-cols-5 gap-3">
        {['CLIENT', 'AGENT', 'ANALYST', 'DECIDER', 'ADMIN'].map(role => {
          const count = users.filter(u => u.role.name === role).length;
          return (
            <Card key={role} className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${roleColors[role]}`}>{role}</span>
            </Card>
          );
        })}
      </div>

      <Card>
        {/* Barre de recherche */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, rôle..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Users size={32} className="mx-auto mb-2" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Utilisateur</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Rôle</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Agence</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Inscription</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role.name] ?? 'bg-gray-100'}`}>
                        {u.role.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{u.agency?.name ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {u.isActive ? '✅ Actif' : '❌ Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant={u.isActive ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(u.id, u.isActive)}
                      >
                        {u.isActive ? <><UserX size={14} /> Désactiver</> : <><UserCheck size={14} /> Activer</>}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
