import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Gavel } from 'lucide-react';
import { decisionService, type Decision } from '../../services/decisionService';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AmortissementTable } from '../amortissement/AmortissementTable';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);

interface Props {
  requestId: string;
  requestedAmount?: number;
  requestedDuration?: number;
  analysisRecommendation?: string;
}

export const DecisionPanel: React.FC<Props> = ({
  requestId, requestedAmount, requestedDuration, analysisRecommendation
}) => {
  const { user } = useAuthStore();
  const role = user?.role.name;
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Formulaire
  const [decisionType, setDecisionType] = useState<string>('APPROVED');
  const [amount, setAmount] = useState(requestedAmount?.toString() ?? '');
  const [duration, setDuration] = useState(requestedDuration?.toString() ?? '');
  const [rate, setRate] = useState('4.25');
  const [conditions, setConditions] = useState('');
  const [refusalReason, setRefusalReason] = useState('');
  const [refusalDetails, setRefusalDetails] = useState('');

  useEffect(() => {
    setLoading(true);
    decisionService.getByRequest(requestId)
      .then(setDecision)
      .catch(() => setDecision(null))
      .finally(() => setLoading(false));
  }, [requestId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload: any = { requestId, decisionType };
      if (decisionType !== 'REJECTED') {
        payload.approvedAmount = parseFloat(amount);
        payload.approvedDuration = parseInt(duration);
        payload.interestRate = parseFloat(rate);
        if (conditions.trim()) payload.conditions = conditions.split('\n').filter(Boolean);
      } else {
        payload.refusalReason = refusalReason;
        payload.refusalDetails = refusalDetails;
      }
      const d = await decisionService.create(payload);
      setDecision(d);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors de la décision');
    } finally {
      setSubmitting(false);
    }
  };

  const canDecide = ['DECIDER', 'ADMIN'].includes(role ?? '');

  if (loading) return (
    <div className="flex items-center justify-center h-24">
      <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  // Décision déjà prise
  if (decision) {
    const configs = {
      APPROVED:    { icon: <CheckCircle size={20} />, label: 'APPROUVÉ',             color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
      REJECTED:    { icon: <XCircle size={20} />,     label: 'REFUSÉ',               color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
      CONDITIONAL: { icon: <AlertTriangle size={20}/>, label: 'APPROUVÉ SOUS CONDITIONS', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    };
    const c = configs[decision.decisionType];
    return (
      <div className={`rounded-xl border p-5 ${c.bg}`}>
        <div className={`flex items-center gap-2 font-bold ${c.color} mb-3`}>
          {c.icon} {c.label}
        </div>
        {decision.decisionType !== 'REJECTED' && decision.approvedAmount && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs">Montant accordé</p><p className="font-bold">{formatCurrency(decision.approvedAmount)}</p></div>
            <div><p className="text-gray-500 text-xs">Durée</p><p className="font-bold">{decision.approvedDuration} mois</p></div>
            <div><p className="text-gray-500 text-xs">Taux</p><p className="font-bold">{decision.interestRate}%</p></div>
            <div><p className="text-gray-500 text-xs">Mensualité</p><p className="font-bold">{decision.monthlyPayment ? formatCurrency(decision.monthlyPayment) : '—'}</p></div>
          </div>
        )}
        {decision.conditions && decision.conditions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Conditions</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {decision.conditions.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
        {decision.refusalReason && (
          <div className="mt-2 text-sm">
            <p className="text-xs text-gray-500">Motif de refus</p>
            <p className="font-medium">{decision.refusalReason}</p>
            {decision.refusalDetails && <p className="text-gray-600 mt-1">{decision.refusalDetails}</p>}
          </div>
        )}

        {/* Tableau d'amortissement — uniquement si approuvé */}
        {decision.decisionType !== 'REJECTED' && decision.approvedAmount && decision.approvedDuration && decision.interestRate && decision.monthlyPayment && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">📊 Tableau d'amortissement</p>
            <AmortissementTable
              capital={Number(decision.approvedAmount)}
              duration={decision.approvedDuration}
              annualRate={Number(decision.interestRate)}
              monthlyPayment={Number(decision.monthlyPayment)}
            />
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Décision prise le {new Date(decision.createdAt).toLocaleDateString('fr-FR')}
        </p>
      </div>
    );
  }

  // Formulaire de décision (décideur uniquement)
  if (!canDecide) return (
    <div className="text-center text-gray-400 py-6">
      <Gavel size={32} className="mx-auto mb-2" />
      <p className="text-sm">En attente de décision du responsable crédit</p>
      {analysisRecommendation && (
        <p className="text-xs mt-1">Recommandation IA : <strong>{analysisRecommendation}</strong></p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {analysisRecommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          💡 Recommandation de l'analyste : <strong>{analysisRecommendation}</strong>
        </div>
      )}

      {/* Type de décision */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: 'APPROVED', label: '✅ Approuver', color: 'border-green-400 bg-green-50 text-green-700' },
          { value: 'CONDITIONAL', label: '⚠️ Conditionnel', color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
          { value: 'REJECTED', label: '❌ Refuser', color: 'border-red-400 bg-red-50 text-red-700' },
        ].map(opt => (
          <button key={opt.value} type="button"
            onClick={() => setDecisionType(opt.value)}
            className={`p-3 text-sm font-medium rounded-xl border-2 transition-all ${
              decisionType === opt.value ? opt.color : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Champs selon le type */}
      {decisionType !== 'REJECTED' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Montant (TND)" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            <Input label="Durée (mois)" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
            <Input label="Taux (%)" type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} />
          </div>
          {decisionType === 'CONDITIONAL' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Conditions (une par ligne)</label>
              <textarea value={conditions} onChange={e => setConditions(e.target.value)}
                rows={3} placeholder="Apport de 10%&#10;Assurance décès obligatoire"
                className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Motif de refus</label>
            <select value={refusalReason} onChange={e => setRefusalReason(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none">
              <option value="">— Sélectionner —</option>
              <option value="TAUX_ENDETTEMENT_ELEVE">Taux d'endettement trop élevé</option>
              <option value="REVENUS_INSUFFISANTS">Revenus insuffisants</option>
              <option value="HISTORIQUE_NEGATIF">Historique de crédit négatif</option>
              <option value="DOSSIER_INCOMPLET">Dossier incomplet</option>
              <option value="FRAUDE_SUSPECTEE">Fraude suspectée</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Détails</label>
            <textarea value={refusalDetails} onChange={e => setRefusalDetails(e.target.value)}
              rows={3} placeholder="Explication détaillée..."
              className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none" />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button onClick={handleSubmit} loading={submitting} className="w-full">
        <Gavel size={16} /> Confirmer la décision
      </Button>
    </div>
  );
};
