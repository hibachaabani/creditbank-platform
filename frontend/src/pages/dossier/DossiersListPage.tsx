import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye } from 'lucide-react';
import { dossierService } from '../../services/dossierService';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, CreditTypeBadge } from '../../components/ui/Badge';
import type { CreditRequest } from '../../types';

const formatAmount = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export const DossiersListPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role.name;
  const [dossiers, setDossiers] = useState<CreditRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dossierService.getAll({ page }).then(res => {
      setDossiers(res.data);
      setTotal(res.meta.total);
    }).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers de crédit</h1>
          <p className="text-gray-500 mt-1">{total} dossier{total > 1 ? 's' : ''} au total</p>
        </div>
        {(role === 'CLIENT' || role === 'AGENT' || role === 'ADMIN') && (
          <Link to="/dossiers/nouveau">
            <Button><Plus size={16} /> Nouveau dossier</Button>
          </Link>
        )}
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : dossiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Search size={32} className="mb-2" />
            <p>Aucun dossier trouvé</p>
            {(role === 'CLIENT' || role === 'AGENT') && (
              <Link to="/dossiers/nouveau" className="mt-3">
                <Button size="sm">Créer un dossier</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Référence</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Montant</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Durée</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Statut</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Date</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dossiers.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">{d.reference}</td>
                    <td className="px-6 py-4"><CreditTypeBadge type={d.creditType} /></td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatAmount(d.requestedAmount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.requestedDuration} mois</td>
                    <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(d.createdAt)}</td>
                    <td className="px-6 py-4">
                      <Link to={`/dossiers/${d.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye size={14} /> Voir
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} sur {Math.ceil(total / 10)}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
              <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>Suivant</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
