import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle, XCircle, Plus, TrendingUp,
  Brain, AlertTriangle, Users2, Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { dossierService } from '../../services/dossierService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, CreditTypeBadge } from '../../components/ui/Badge';
import type { CreditRequest } from '../../types';

interface Stats {
  total: number;
  byStatus: { status: string; _count: number }[];
  byType: { creditType: string; _count: number }[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDossiers, setRecentDossiers] = useState<CreditRequest[]>([]);

  useEffect(() => {
    dossierService.getStats().then(setStats).catch(() => {});
    dossierService.getAll({ page: 1, limit: 5 }).then(r => setRecentDossiers(r.data)).catch(() => {});
  }, []);

  const role = user?.role.name;
  const isClientOrAgent = role === 'CLIENT' || role === 'AGENT';

  const statusCount = (...statuses: string[]) =>
    statuses.reduce((sum, s) => sum + (stats?.byStatus.find(b => b.status === s)?._count ?? 0), 0);

  const kpis = [
    {
      label: 'Total dossiers',
      value: stats?.total ?? 0,
      icon: <FileText size={22} className="text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      label: 'En cours',
      value: statusCount('SUBMITTED', 'UNDER_REVIEW', 'IN_ANALYSIS', 'PENDING_DECISION'),
      icon: <Clock size={22} className="text-orange-600" />,
      color: 'bg-orange-50',
    },
    {
      label: 'Approuvés',
      value: statusCount('APPROVED', 'CONDITIONALLY_APPROVED', 'ACCEPTED_BY_CLIENT', 'ACTIVE'),
      icon: <CheckCircle size={22} className="text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: 'Refusés',
      value: statusCount('REJECTED', 'REFUSED_BY_CLIENT'),
      icon: <XCircle size={22} className="text-red-600" />,
      color: 'bg-red-50',
    },
  ];

  const roleGreetings: Record<string, string> = {
    CLIENT: 'Bienvenue sur votre espace crédit',
    AGENT: 'Espace conseiller bancaire',
    ANALYST: 'Espace analyste crédit',
    DECIDER: 'Espace responsable crédit',
    ADMIN: 'Tableau de bord administrateur',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {user?.firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1">{roleGreetings[role ?? ''] ?? 'Tableau de bord'}</p>
        </div>
        {isClientOrAgent && (
          <Link to="/dossiers/nouveau">
            <Button>
              <Plus size={16} />
              Nouvelle demande
            </Button>
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.color}`}>
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dossiers récents */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Dossiers récents</h2>
              <Link to="/dossiers" className="text-sm text-blue-600 hover:underline">Voir tout</Link>
            </div>
            {recentDossiers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <FileText size={32} className="mb-2" />
                <p className="text-sm">Aucun dossier</p>
                {isClientOrAgent && (
                  <Link to="/dossiers/nouveau" className="mt-3">
                    <Button size="sm">Créer votre premier dossier</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentDossiers.map(d => (
                  <Link key={d.id} to={`/dossiers/${d.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FileText size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 font-mono">{d.reference}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <CreditTypeBadge type={d.creditType} />
                          <span className="text-xs text-gray-400">{formatDate(d.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">{formatCurrency(d.requestedAmount)}</span>
                      <StatusBadge status={d.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-4">
          {/* Répartition par type */}
          {stats && stats.byType.length > 0 && (
            <Card>
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" /> Par type de crédit
                </h2>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2">
                {stats.byType.map(item => (
                  <div key={item.creditType} className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{item._count}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {item.creditType.charAt(0) + item.creditType.slice(1).toLowerCase()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Actions rapides selon le rôle */}
          <Card>
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Actions rapides</h2>
            </div>
            <div className="p-4 space-y-2">
              {role === 'CLIENT' && (
                <>
                  <Link to="/dossiers/nouveau">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-200">
                      <Plus size={18} className="text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Nouvelle demande</p>
                        <p className="text-xs text-gray-400">Crédit auto, immobilier...</p>
                      </div>
                    </div>
                  </Link>
                  <Link to="/dossiers">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <FileText size={18} className="text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Mes dossiers</p>
                        <p className="text-xs text-gray-400">Suivre mes demandes</p>
                      </div>
                    </div>
                  </Link>
                </>
              )}
              {(role === 'ANALYST' || role === 'AGENT') && (
                <Link to="/dossiers">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 cursor-pointer transition-colors border border-transparent hover:border-orange-200">
                    <Brain size={18} className="text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dossiers à traiter</p>
                      <p className="text-xs text-gray-400">{statusCount('SUBMITTED', 'UNDER_REVIEW', 'IN_ANALYSIS')} en attente</p>
                    </div>
                  </div>
                </Link>
              )}
              {role === 'DECIDER' && (
                <Link to="/dossiers">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 cursor-pointer transition-colors border border-transparent hover:border-purple-200">
                    <AlertTriangle size={18} className="text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Décisions en attente</p>
                      <p className="text-xs text-gray-400">{statusCount('PENDING_DECISION')} dossier(s)</p>
                    </div>
                  </div>
                </Link>
              )}
              {role === 'ADMIN' && (
                <>
                  <Link to="/utilisateurs">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <Users2 size={18} className="text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Utilisateurs</p>
                        <p className="text-xs text-gray-400">Gérer les comptes</p>
                      </div>
                    </div>
                  </Link>
                  <Link to="/rapports">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                      <TrendingUp size={18} className="text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Rapports</p>
                        <p className="text-xs text-gray-400">Statistiques globales</p>
                      </div>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
