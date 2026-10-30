import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, Clock, CheckCircle, XCircle, Brain } from 'lucide-react';
import { decisionService } from '../../services/decisionService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);

const riskColors: Record<string, string> = {
  LOW: 'text-green-600 bg-green-50',
  MEDIUM: 'text-yellow-600 bg-yellow-50',
  HIGH: 'text-orange-600 bg-orange-50',
  VERY_HIGH: 'text-red-600 bg-red-50',
};

export const DeciderDashboard: React.FC = () => {
  const [pending, setPending] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      decisionService.getPending(),
      decisionService.getStats(),
    ]).then(([p, s]) => {
      setPending(p);
      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord — Responsable Crédit</h1>
        <p className="text-gray-500 mt-1">Dossiers en attente de décision</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">En attente</p>
              <p className="text-3xl font-bold text-purple-700 mt-1">{pending.length}</p>
            </div>
            <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-purple-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Approuvés</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{stats?.approved ?? 0}</p>
            </div>
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Refusés</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{stats?.rejected ?? 0}</p>
            </div>
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Taux approbation</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{stats?.approvalRate ?? 0}%</p>
            </div>
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Dossiers en attente */}
      <Card>
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
            <Gavel size={18} className="text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Dossiers en attente de décision</h2>
            <p className="text-xs text-gray-500">{pending.length} dossier{pending.length > 1 ? 's' : ''} à traiter</p>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <CheckCircle size={40} className="mb-3 text-green-300" />
            <p className="font-medium text-green-600">Aucun dossier en attente</p>
            <p className="text-sm mt-1">Tous les dossiers ont été traités</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pending.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Indicateur de risque */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                    d.risk_level ? riskColors[d.risk_level] : 'bg-gray-100 text-gray-500'
                  }`}>
                    {d.credit_score ?? '—'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-gray-900">{d.reference}</p>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {d.credit_type}
                      </span>
                      {d.risk_level && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColors[d.risk_level]}`}>
                          {d.risk_level === 'LOW' ? 'Risque faible' :
                           d.risk_level === 'MEDIUM' ? 'Risque modéré' :
                           d.risk_level === 'HIGH' ? 'Risque élevé' : 'Risque très élevé'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-semibold text-blue-600">
                        {formatCurrency(parseFloat(d.requested_amount))}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{d.requested_duration} mois</span>
                      {d.recommendation && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className={`text-xs font-medium ${
                            d.recommendation === 'FAVORABLE' ? 'text-green-600' :
                            d.recommendation === 'UNFAVORABLE' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {d.recommendation === 'FAVORABLE' ? '✅ Favorable' :
                             d.recommendation === 'UNFAVORABLE' ? '❌ Défavorable' : '⚠️ Conditionnel'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Link to={`/dossiers/${d.id}`}>
                  <Button size="sm">
                    <Gavel size={14} />
                    Décider
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

