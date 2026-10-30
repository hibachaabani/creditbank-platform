import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { dossierService } from '../../services/dossierService';
import { decisionService } from '../../services/decisionService';
import { Card } from '../../components/ui/Card';

export const ReportsPage: React.FC = () => {
  const [dossierStats, setDossierStats] = useState<any>(null);
  const [decisionStats, setDecisionStats] = useState<any>(null);

  useEffect(() => {
    dossierService.getStats().then(setDossierStats).catch(() => {});
    decisionService.getStats().then(setDecisionStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports & Statistiques</h1>
        <p className="text-gray-500 mt-1">Vue d'ensemble de l'activité crédit</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total dossiers', value: dossierStats?.total ?? '—', icon: <FileText size={20} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Décisions prises', value: decisionStats?.total ?? '—', icon: <BarChart3 size={20} className="text-purple-600" />, bg: 'bg-purple-50' },
          { label: 'Taux d\'approbation', value: decisionStats ? `${decisionStats.approvalRate}%` : '—', icon: <TrendingUp size={20} className="text-green-600" />, bg: 'bg-green-50' },
          { label: 'En attente', value: dossierStats?.byStatus?.find((s: any) => s.status === 'PENDING_DECISION')?._count ?? 0, icon: <Clock size={20} className="text-orange-600" />, bg: 'bg-orange-50' },
        ].map(kpi => (
          <Card key={kpi.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Statuts des dossiers */}
      {dossierStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Par statut</h2>
            </div>
            <div className="p-6 space-y-3">
              {dossierStats.byStatus?.map((item: any) => {
                const colors: Record<string, string> = {
                  DRAFT: 'bg-gray-200', SUBMITTED: 'bg-blue-400', UNDER_REVIEW: 'bg-yellow-400',
                  IN_ANALYSIS: 'bg-orange-400', PENDING_DECISION: 'bg-purple-400',
                  APPROVED: 'bg-green-400', REJECTED: 'bg-red-400', ACTIVE: 'bg-green-500',
                };
                const pct = dossierStats.total > 0 ? (item._count / dossierStats.total) * 100 : 0;
                return (
                  <div key={item.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.status}</span>
                      <span className="font-semibold">{item._count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div
                        className={`h-2 rounded-full ${colors[item.status] ?? 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Par type de crédit</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              {dossierStats.byType?.map((item: any) => (
                <div key={item.creditType} className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{item._count}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {item.creditType.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Décisions */}
      {decisionStats && (
        <Card>
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Résultats des décisions</h2>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-xl p-5">
              <CheckCircle size={28} className="text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-700">{decisionStats.approved}</p>
              <p className="text-sm text-green-600 mt-1">Approuvés</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-5">
              <Clock size={28} className="text-yellow-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-yellow-700">{decisionStats.conditional}</p>
              <p className="text-sm text-yellow-600 mt-1">Conditionnels</p>
            </div>
            <div className="bg-red-50 rounded-xl p-5">
              <XCircle size={28} className="text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-700">{decisionStats.rejected}</p>
              <p className="text-sm text-red-600 mt-1">Refusés</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
