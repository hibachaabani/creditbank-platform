import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, FileText, Clock, Brain } from 'lucide-react';
import { dossierService } from '../../services/dossierService';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, CreditTypeBadge } from '../../components/ui/Badge';
import { DocumentUploader } from '../../components/document/DocumentUploader';
import { AnalysisPanel } from '../../components/analysis/AnalysisPanel';
import { DecisionPanel } from '../../components/decision/DecisionPanel';
import type { CreditRequest, StatusHistory, DossierMessage } from '../../types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const DossierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role.name;

  const [dossier, setDossier] = useState<CreditRequest | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [messages, setMessages] = useState<DossierMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [d, h, m] = await Promise.all([
        dossierService.getOne(id),
        dossierService.getHistory(id),
        dossierService.getMessages(id),
      ]);
      setDossier(d);
      setHistory(h);
      setMessages(m);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSubmit = async () => {
    if (!id || !dossier) return;
    setSubmitting(true);
    try {
      const updated = await dossierService.submit(id);
      setDossier(updated);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (status: string, comment?: string) => {
    if (!id) return;
    try {
      await dossierService.updateStatus(id, status, comment);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Erreur');
    }
  };

  const handleSendMessage = async () => {
    if (!id || !newMessage.trim()) return;
    await dossierService.sendMessage(id, newMessage.trim());
    setNewMessage('');
    const m = await dossierService.getMessages(id);
    setMessages(m);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!dossier) return <div className="text-center text-gray-500 mt-12">Dossier introuvable</div>;

  const canSubmit = dossier.status === 'DRAFT' &&
    (dossier.clientId === user?.id || dossier.agentId === user?.id || role === 'ADMIN');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/dossiers')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
            <ArrowLeft size={16} /> Retour aux dossiers
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{dossier.reference}</h1>
            <StatusBadge status={dossier.status} />
          </div>
          <p className="text-gray-500 mt-1">Créé le {formatDate(dossier.createdAt)}</p>
        </div>
        {canSubmit && (
          <Button onClick={handleSubmit} loading={submitting}>
            <Send size={16} /> Soumettre le dossier
          </Button>
        )}

        {/* Boutons Agent */}
        {role === 'AGENT' && dossier.status === 'SUBMITTED' && (
          <Button onClick={() => handleChangeStatus('IN_ANALYSIS', 'Dossier envoyé en analyse')}>
            <Brain size={16} /> Envoyer en analyse
          </Button>
        )}

        {/* Boutons Analyste */}
        {role === 'ANALYST' && dossier.status === 'SUBMITTED' && (
          <Button onClick={() => handleChangeStatus('IN_ANALYSIS', 'Prise en charge par l\'analyste')}>
            <Brain size={16} /> Prendre en charge
          </Button>
        )}

        {/* Boutons Admin */}
        {role === 'ADMIN' && ['SUBMITTED', 'UNDER_REVIEW'].includes(dossier.status) && (
          <Button onClick={() => handleChangeStatus('IN_ANALYSIS', 'Passé en analyse par admin')}>
            <Brain size={16} /> Passer en analyse
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infos principales */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Détails du crédit</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Type', value: <CreditTypeBadge type={dossier.creditType} /> },
                { label: 'Montant', value: <span className="font-bold text-blue-600">{formatCurrency(dossier.requestedAmount)}</span> },
                { label: 'Durée', value: `${dossier.requestedDuration} mois` },
                { label: 'Revenus nets', value: formatCurrency(dossier.monthlyIncome) },
                { label: 'Dettes existantes', value: formatCurrency(dossier.existingDebts) },
                { label: 'Taux endettement', value: (() => {
                  const r = 0.04/12;
                  const m = dossier.requestedAmount * (r * Math.pow(1+r, dossier.requestedDuration)) / (Math.pow(1+r, dossier.requestedDuration) - 1);
                  const ratio = ((Number(dossier.existingDebts) + m) / Number(dossier.monthlyIncome) * 100).toFixed(1);
                  return (
                    <span className={parseFloat(ratio) <= 33 ? 'text-green-600 font-semibold' : parseFloat(ratio) <= 40 ? 'text-yellow-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {ratio}%
                    </span>
                  );
                })() },
              ].map(row => (
                <div key={row.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{row.label}</p>
                  <div className="text-sm font-medium text-gray-900">{row.value}</div>
                </div>
              ))}
            </div>
            {dossier.purpose && (
              <div className="px-6 pb-6">
                <p className="text-xs text-gray-500 mb-1">Objet du crédit</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{dossier.purpose}</p>
              </div>
            )}
          </Card>

          {/* Documents — visible par tous mais upload uniquement pour le CLIENT */}
          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={16} />
                {role === 'CLIENT' ? 'Mes documents justificatifs' : 'Documents du dossier'}
              </h2>
              {role !== 'CLIENT' && (
                <p className="text-xs text-gray-400 mt-1">
                  {role === 'AGENT' ? 'Vérifiez et validez les documents fournis par le client' :
                   role === 'ANALYST' ? 'Documents disponibles pour analyse' :
                   'Documents du dossier'}
                </p>
              )}
            </div>
            <div className="p-6">
              <DocumentUploader
                requestId={dossier.id}
                creditType={dossier.creditType}
                canUpload={role === 'CLIENT' || role === 'ADMIN'}
                canValidate={['AGENT', 'ANALYST', 'ADMIN'].includes(role ?? '')}
              />
            </div>
          </Card>

          {/* Messagerie */}
          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Messages</h2>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun message</p>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                    msg.senderId === user?.id
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.senderId === user?.id ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrire un message..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="sm">
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Historique + Analyse IA */}
        <div className="space-y-4">
          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={16} /> Historique
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {history.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                      i === history.length - 1 ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />
                    {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <StatusBadge status={h.newStatus as any} />
                    {h.comment && <p className="text-xs text-gray-500 mt-1">{h.comment}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(h.changedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Analyse IA */}
          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">🧠 Analyse IA</h2>
            </div>
            <div className="p-4">
              <AnalysisPanel requestId={dossier.id} />
            </div>
          </Card>

          {/* Décision — visible uniquement pour DECIDER et ADMIN quand dossier en PENDING_DECISION */}
          {(['DECIDER', 'ADMIN'].includes(role ?? '') || ['APPROVED','CONDITIONALLY_APPROVED','REJECTED'].includes(dossier.status)) && (
            <Card>
              <div className="p-6 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">⚖️ Décision de crédit</h2>
              </div>
              <div className="p-4">
                <DecisionPanel
                  requestId={dossier.id}
                  requestedAmount={Number(dossier.requestedAmount)}
                  requestedDuration={dossier.requestedDuration}
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
