
import React, { useEffect, useState } from 'react';
import { Brain, CheckCircle, XCircle, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { analysisService, type Analysis, type ScoringFactor } from '../../services/analysisService';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { ScoreGauge } from './ScoreGauge';

const recConfig = {
  FAVORABLE:    { label: 'Favorable',              icon: <CheckCircle size={16} />,  color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  UNFAVORABLE:  { label: 'Défavorable',             icon: <XCircle size={16} />,      color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  CONDITIONAL:  { label: 'Favorable conditionnel',  icon: <AlertTriangle size={16} />, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
};

interface Props { requestId: string; }

export const AnalysisPanel: React.FC<Props> = ({ requestId }) => {
  const { user } = useAuthStore();
  const role = user?.role.name;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editReport, setEditReport] = useState('');
  const [editRec, setEditRec] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const a = await analysisService.getByRequest(requestId);
      setAnalysis(a);
      setEditReport(a.narrativeReport ?? '');
      setEditRec(a.recommendation ?? '');
      setEditNotes(a.recommendationNotes ?? '');
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [requestId]);

  const handleLaunch = async () => {
    setLaunching(true);
    setError('');
    try {
      const a = await analysisService.create(requestId);
      setAnalysis(a);
      setEditReport(a.narrativeReport ?? '');
      setEditRec(a.recommendation ?? '');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors du lancement');
    } finally {
      setLaunching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await analysisService.update(requestId, {
        narrativeReport: editReport,
        recommendation: editRec as any,
        recommendationNotes: editNotes,
      });
      setAnalysis(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const updated = await analysisService.submit(requestId);
      setAnalysis(updated);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const canAnalyse = ['ANALYST', 'ADMIN'].includes(role ?? '');

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  // Pas encore d'analyse
  if (!analysis) return (
    <div className="text-center py-8 space-y-3">
      <Brain size={40} className="text-gray-300 mx-auto" />
      <p className="text-gray-500">Aucune analyse lancée pour ce dossier</p>
      {canAnalyse && (
        <Button onClick={handleLaunch} loading={launching}>
          <Brain size={16} /> Lancer l'analyse IA
        </Button>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  const factors = (analysis.aiExplanation as any)?.factors as ScoringFactor[] ?? [];
  const isSubmitted = !!analysis.submittedAt;
  const rec = recConfig[analysis.recommendation ?? 'CONDITIONAL'];

  return (
    <div className="space-y-4">
      {/* Score IA */}
      {analysis.creditScore != null && analysis.riskLevel && (
        <ScoreGauge score={analysis.creditScore} riskLevel={analysis.riskLevel} />
      )}

      {/* Métriques financières */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Taux endettement',  value: `${analysis.debtRatio ?? '—'}%`,
            note: analysis.debtRatio ? (Number(analysis.debtRatio) <= 33 ? '✅ Excellent' : Number(analysis.debtRatio) <= 40 ? '⚠️ Acceptable' : '❌ Élevé') : '' },
          { label: 'Capacité remb.',    value: analysis.repaymentCapacity ? `${Number(analysis.repaymentCapacity).toLocaleString('fr-TN')} TND` : '—', note: '' },
          { label: 'Revenu restant',    value: analysis.netIncomeAfter ? `${Number(analysis.netIncomeAfter).toLocaleString('fr-TN')} TND` : '—', note: '' },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{m.value}</p>
            {m.note && <p className="text-xs mt-0.5">{m.note}</p>}
          </div>
        ))}
      </div>

      {/* Explication en français du score */}
      {analysis.creditScore != null && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">📋 Interprétation du score</p>
          <p className="text-sm text-slate-600">
            {analysis.creditScore >= 700
              ? `Avec un score de ${analysis.creditScore}/1000, ce client présente un profil financier solide. Le risque de non-remboursement est faible.`
              : analysis.creditScore >= 550
              ? `Avec un score de ${analysis.creditScore}/1000, ce client présente un profil acceptable mais nécessite une attention particulière. Un accord conditionnel est envisageable.`
              : analysis.creditScore >= 400
              ? `Avec un score de ${analysis.creditScore}/1000, ce client présente des indicateurs préoccupants. La décision doit être prudente et conditionnée à des garanties supplémentaires.`
              : `Avec un score de ${analysis.creditScore}/1000, le profil financier de ce client présente des risques élevés. Un refus est recommandé.`
            }
          </p>
        </div>
      )}

      {/* Facteurs d'explication */}
      {factors.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Facteurs IA</p>
          <div className="space-y-2">
            {factors.map((f, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                f.impact === 'POSITIVE' ? 'bg-green-50' : f.impact === 'NEGATIVE' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <span className="text-base leading-none mt-0.5">
                  {f.impact === 'POSITIVE' ? '✅' : f.impact === 'NEGATIVE' ? '❌' : '➡️'}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{f.name}</p>
                  <p className="text-gray-500">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommandation */}
      {analysis.recommendation && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border ${rec.bg}`}>
          <span className={rec.color}>{rec.icon}</span>
          <div>
            <p className={`text-sm font-semibold ${rec.color}`}>Recommandation : {rec.label}</p>
            {analysis.recommendationNotes && (
              <p className="text-xs text-gray-600 mt-0.5">{analysis.recommendationNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Rapport narratif (éditable pour analyste) */}
      {canAnalyse && !isSubmitted && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700">Rapport d'analyse</p>
          <textarea
            value={editReport}
            onChange={e => setEditReport(e.target.value)}
            rows={8}
            className="w-full text-xs font-mono border border-gray-300 rounded-lg p-3 focus:border-blue-500 outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Recommandation finale</label>
              <select
                value={editRec}
                onChange={e => setEditRec(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
              >
                <option value="">— Choisir —</option>
                <option value="FAVORABLE">Favorable</option>
                <option value="CONDITIONAL">Favorable conditionnel</option>
                <option value="UNFAVORABLE">Défavorable</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Notes</label>
              <input
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
                placeholder="Conditions, observations..."
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSave} loading={saving} size="sm">
              <RefreshCw size={14} /> Sauvegarder
            </Button>
            <Button onClick={handleSubmit} loading={submitting} size="sm" disabled={!editRec}>
              <Send size={14} /> Soumettre l'analyse
            </Button>
          </div>
        </div>
      )}

      {isSubmitted && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle size={16} />
          Analyse soumise le {new Date(analysis.submittedAt!).toLocaleDateString('fr-FR')}
        </div>
      )}
    </div>
  );
};
