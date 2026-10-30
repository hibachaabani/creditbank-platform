/**
 * ============================================================
 * PAGE : NOUVELLE DEMANDE DE CRÉDIT
 * ============================================================
 * Cette page permet à un CLIENT, AGENT ou ADMIN de soumettre
 * une demande de crédit en 3 étapes :
 *
 *   Étape 1 → Choisir le type de crédit (immobilier, auto...)
 *   Étape 2 → Saisir le montant et la durée + voir la simulation
 *   Étape 3 → Saisir les revenus + voir l'analyse d'endettement
 *
 * À la soumission :
 *   1. Le dossier est créé en statut DRAFT
 *   2. Il est immédiatement soumis → statut SUBMITTED
 *   3. L'utilisateur est redirigé vers la page du dossier
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { dossierService } from '../../services/dossierService';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ComparateurScenarios } from '../../components/simulateur/ComparateurScenarios';
import { GraphiqueAmortissement } from '../../components/simulateur/GraphiqueAmortissement';
import type { SimulationResult } from '../../types';

// ─── Schéma de validation Zod ────────────────────────────────────────────────
// Zod valide chaque champ AVANT de soumettre le formulaire
// Si une règle n'est pas respectée → message d'erreur affiché sous le champ
const schema = z.object({
  creditType: z.enum(['IMMOBILIER', 'AUTO', 'CONSOMMATION', 'PROFESSIONNEL', 'ETUDIANT']),
  requestedAmount:   z.coerce.number().min(1000, 'Minimum 1 000 TND'),
  requestedDuration: z.coerce.number().min(6, 'Minimum 6 mois').max(360, 'Maximum 360 mois'),
  monthlyIncome:     z.coerce.number().min(1, 'Requis'),
  existingDebts:     z.coerce.number().min(0).default(0),
  purpose:           z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Types de crédit avec taux indicatifs (marché tunisien) ──────────────────
const creditTypes = [
  { value: 'IMMOBILIER',    label: '🏠 Immobilier',   desc: 'Achat ou construction',     rate: '8%' },
  { value: 'AUTO',          label: '🚗 Auto',          desc: 'Véhicule neuf ou occasion',  rate: '10.5%' },
  { value: 'CONSOMMATION',  label: '💳 Consommation',  desc: 'Dépense personnelle',        rate: '12%' },
  { value: 'PROFESSIONNEL', label: '💼 Professionnel', desc: 'Investissement pro',         rate: '9.5%' },
  { value: 'ETUDIANT',      label: '🎓 Étudiant',      desc: 'Frais de scolarité',         rate: '6%' },
];

// ─── Formatage monétaire (ex: 1234 → "1 234 TND") ────────────────────────────
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);

// ─── Composant principal ──────────────────────────────────────────────────────
export const NouveauDossierPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.role.name;

  // Contrôle d'accès : seuls CLIENT, AGENT et ADMIN peuvent créer un dossier
  // Les autres rôles (ANALYST, DECIDER) sont redirigés vers le tableau de bord
  if (!['CLIENT', 'AGENT', 'ADMIN'].includes(role ?? '')) {
    return <Navigate to="/dashboard" replace />;
  }

  // État de l'étape courante (1, 2 ou 3)
  const [step, setStep] = useState(1);

  // Résultat de la simulation renvoyé par le backend (mensualité, coût total, taux)
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  // Message d'erreur lors de la soumission
  const [error, setError] = useState('');

  // ─── Initialisation du formulaire avec React Hook Form + Zod ────────────────
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { existingDebts: 0 },
  });

  // Surveillance en temps réel des champs du formulaire
  const amount     = watch('requestedAmount');   // montant demandé
  const duration   = watch('requestedDuration'); // durée en mois
  const income     = watch('monthlyIncome');     // revenus mensuels nets
  const debts      = watch('existingDebts') ?? 0; // autres crédits en cours
  const creditType = watch('creditType');         // type de crédit sélectionné

  // ─── Simulation automatique en temps réel ────────────────────────────────────
  // Dès que le montant ou la durée change → appel API → calcul mensualité
  // L'API retourne : { monthlyPayment, totalCost, totalInterest, annualRate }
  useEffect(() => {
    if (amount > 0 && duration > 0) {
      dossierService.simulate(amount, duration, undefined, creditType)
        .then(setSimulation)
        .catch(() => {}); // silencieux si l'API n'est pas encore disponible
    }
  }, [amount, duration]);

  // ─── Calcul du taux d'endettement ────────────────────────────────────────────
  // Formule : (dettes existantes + nouvelle mensualité) / revenus × 100
  // Exemple  : (200 + 125) / 5000 × 100 = 6.5%
  // Ce taux détermine la couleur et le message affiché à l'étape 3
  const debtRatio = simulation && income > 0
    ? (((debts + simulation.monthlyPayment) / income) * 100).toFixed(1)
    : null;

  // Protection contre les valeurs absurdes (revenus très faibles → ex: 68614%)
  // On affiche ">999" si le taux dépasse 999% pour rester lisible
  const debtRatioDisplay = debtRatio
    ? parseFloat(debtRatio) > 999 ? '>999' : debtRatio
    : null;

  // ─── Soumission du formulaire ─────────────────────────────────────────────────
  // 1. Crée le dossier en base → statut DRAFT
  // 2. Le soumet immédiatement → statut SUBMITTED
  // 3. Redirige vers la page de suivi du dossier
  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const dossier = await dossierService.create(data);   // POST /dossiers
      await dossierService.submit(dossier.id);             // PATCH /dossiers/:id/submit
      navigate(`/dossiers/${dossier.id}`);                 // redirection
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la soumission');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande de crédit</h1>
        <p className="text-gray-500 mt-1">Complétez le formulaire pour soumettre votre demande</p>
      </div>

      {/* ── Indicateur de progression (étapes 1, 2, 3) ──────────────────────── */}
      {/* Vert = étape terminée, Bleu = étape courante, Gris = étape future     */}
      <div className="flex items-center gap-3">
        {['Type de crédit', 'Montant & durée', 'Revenus & récap'].map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > i + 1 ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${step === i + 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ══════════════════════════════════════════════════════════════════════
            ÉTAPE 1 — TYPE DE CRÉDIT
            L'utilisateur choisit le type de crédit parmi 5 options.
            Chaque type a un taux d'intérêt différent qui sera utilisé
            pour la simulation à l'étape 2.
        ══════════════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <Card>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Quel type de crédit souhaitez-vous ?</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {creditTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue('creditType', type.value as any)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    creditType === type.value
                      ? 'border-blue-500 bg-blue-50'   // sélectionné → fond bleu
                      : 'border-gray-200 hover:border-gray-300' // non sélectionné
                  }`}
                >
                  <p className="font-semibold text-gray-900">{type.label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{type.desc}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Taux indicatif : {type.rate}</p>
                </button>
              ))}
            </div>
            {errors.creditType && (
              <p className="px-6 pb-4 text-sm text-red-500">{errors.creditType.message}</p>
            )}
            <div className="px-6 pb-6">
              {/* Le bouton est désactivé tant qu'aucun type n'est sélectionné */}
              <Button type="button" onClick={() => creditType && setStep(2)} disabled={!creditType} className="w-full">
                Continuer <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ÉTAPE 2 — MONTANT ET DURÉE
            L'utilisateur saisit le montant et la durée.
            La simulation se déclenche automatiquement (useEffect) et affiche :
              - La mensualité estimée
              - Le total des intérêts
              - Le coût total du crédit
            Le comparateur de scénarios et le graphique d'amortissement
            s'affichent ensuite pour aider le choix de la durée.
        ══════════════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold">Montant et durée</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Montant demandé (TND)"
                    type="number"
                    placeholder="70000"
                    error={errors.requestedAmount?.message}
                    {...register('requestedAmount')}
                  />
                  <Input
                    label="Durée (mois)"
                    type="number"
                    placeholder="240"
                    error={errors.requestedDuration?.message}
                    {...register('requestedDuration')}
                  />
                </div>
                <Input
                  label="Objet du crédit (optionnel)"
                  placeholder="Ex: Achat appartement à Casablanca"
                  {...register('purpose')}
                />
              </div>
            </Card>

            {/* ── Résultat de la simulation en temps réel ──────────────────── */}
            {/* S'affiche dès que le backend retourne un résultat             */}
            {simulation && (
              <Card className="border-blue-200 bg-blue-50">
                <div className="p-6">
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-4">
                    <Calculator size={18} /> Simulation indicative
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {/* Mensualité = calculée par la formule des annuités constantes */}
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(simulation.monthlyPayment)}</p>
                      <p className="text-xs text-blue-600 mt-1">Mensualité estimée</p>
                    </div>
                    {/* Total intérêts = (mensualité × durée) - capital */}
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(simulation.totalInterest)}</p>
                      <p className="text-xs text-blue-600 mt-1">Total intérêts</p>
                    </div>
                    {/* Coût total = mensualité × durée */}
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(simulation.totalCost)}</p>
                      <p className="text-xs text-blue-600 mt-1">Coût total</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Comparateur de 3 scénarios de durée ──────────────────────── */}
            {/* Génère automatiquement 3 durées selon le montant saisi        */}
            {amount > 0 && creditType && (
              <ComparateurScenarios
                amount={amount}
                annualRate={simulation?.annualRate ?? 9}
                selectedDuration={duration}
                onSelect={(d) => setValue('requestedDuration', d)} // clic → remplit le champ durée
              />
            )}

            {/* ── Graphique d'évolution du capital restant (SVG natif) ──────── */}
            {amount > 0 && duration > 0 && (
              <GraphiqueAmortissement
                capital={amount}
                duration={duration}
                annualRate={simulation?.annualRate ?? 9}
              />
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Retour
              </Button>
              <Button type="button" onClick={() => setStep(3)} className="flex-1">
                Continuer <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ÉTAPE 3 — REVENUS ET RÉCAPITULATIF
            L'utilisateur saisit ses revenus et ses dettes existantes.
            L'analyse de capacité de remboursement s'affiche en temps réel
            avec un indicateur visuel coloré selon 3 seuils :
              ≤ 33% → 🟢 VERT   — Capacité excellente
              ≤ 40% → 🟡 JAUNE  — Capacité acceptable (seuil réglementaire)
              > 40% → 🔴 ROUGE  — Capacité insuffisante (risque de refus)
        ══════════════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold">Situation financière</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Revenus mensuels nets (TND)"
                    type="number"
                    placeholder="5000"
                    error={errors.monthlyIncome?.message}
                    {...register('monthlyIncome')}
                  />
                  <Input
                    label="Autres crédits en cours — autres banques (TND/mois)"
                    type="number"
                    placeholder="0"
                    {...register('existingDebts')}
                  />
                </div>

                {/* ── Analyse de capacité de remboursement ──────────────────── */}
                {/* S'affiche seulement quand : simulation disponible + revenus saisis */}
                {debtRatio && simulation && income > 0 && (
                  (() => {
                    // ── Calculs de base ──────────────────────────────────────
                    // ratio = taux d'endettement plafonné à 100 pour la barre visuelle
                    const ratio        = Math.min(parseFloat(debtRatio), 100);
                    // totalCharges = prêts en cours + nouvelle mensualité
                    const totalCharges = debts + simulation.monthlyPayment;
                    // resteAVivre = ce qu'il reste au client après toutes ses charges
                    const resteAVivre  = income - totalCharges;

                    // ── Détermination du seuil (3 intervalles bancaires) ─────
                    const isGood    = ratio <= 33;          // excellent
                    const isWarning = ratio > 33 && ratio <= 40; // acceptable
                    const isDanger  = ratio > 40;           // insuffisant → risque refus

                    // ── Classes CSS selon le seuil (couleur dynamique) ───────
                    const borderClass = isGood ? 'border-green-200' : isWarning ? 'border-yellow-200' : 'border-red-200';
                    const bgClass     = isGood ? 'bg-green-50'      : isWarning ? 'bg-yellow-50'      : 'bg-red-50';
                    const textClass   = isGood ? 'text-green-700'   : isWarning ? 'text-yellow-700'   : 'text-red-700';
                    const badgeBg     = isGood ? 'bg-green-100'     : isWarning ? 'bg-yellow-100'     : 'bg-red-100';
                    // Couleur de la barre de la nouvelle mensualité
                    const barColor    = isGood ? 'bg-green-500'     : isWarning ? 'bg-yellow-500'     : 'bg-red-500';
                    const icon        = isGood ? '✅' : isWarning ? '⚠️' : '❌';
                    const statusText  = isGood
                      ? 'Capacité excellente'
                      : isWarning
                      ? 'Capacité acceptable'
                      : 'Capacité insuffisante';

                    return (
                      <div className={`rounded-2xl border ${borderClass} ${bgClass} overflow-hidden`}>

                        {/* En-tête avec badge taux % coloré ──────────────── */}
                        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              Analyse de capacité de remboursement
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Répartition de vos revenus mensuels
                            </p>
                          </div>
                          {/* Badge taux d'endettement — couleur selon seuil */}
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${badgeBg}`}>
                            <span className="text-sm">{icon}</span>
                            <span className={`text-xs font-bold ${textClass}`}>{debtRatioDisplay}%</span>
                          </div>
                        </div>

                        {/* Barre segmentée ─────────────────────────────────
                            Représente visuellement la répartition des revenus :
                            🟠 Orange  = prêts en cours (dettes existantes)
                            🟢/🟡/🔴  = nouvelle mensualité demandée
                            ⬜ Gris    = reste disponible pour vivre
                            │           = marqueur du seuil 40% réglementaire
                        ──────────────────────────────────────────────────── */}
                        <div className="px-5 pb-2">
                          <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">

                            {/* Segment 1 : prêts en cours (orange, commence à gauche) */}
                            {debts > 0 && (
                              <div
                                className="absolute left-0 top-0 h-full bg-orange-400 transition-all"
                                style={{ width: `${Math.min((debts / income) * 100, 100)}%` }}
                              />
                            )}

                            {/* Segment 2 : nouvelle mensualité (couleur selon seuil)
                                Commence juste après le segment des prêts en cours */}
                            <div
                              className={`absolute top-0 h-full ${barColor} transition-all`}
                              style={{
                                left:  `${Math.min((debts / income) * 100, 100)}%`,
                                width: `${Math.min(
                                  (simulation.monthlyPayment / income) * 100,
                                  100 - Math.min((debts / income) * 100, 100)
                                )}%`,
                              }}
                            />

                            {/* Marqueur vertical du seuil réglementaire à 40% */}
                            <div
                              className="absolute top-0 h-full w-0.5 bg-gray-700 opacity-60"
                              style={{ left: '40%' }}
                            />
                          </div>

                          {/* Légende de la barre ──────────────────────────── */}
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-3">
                              {debts > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
                                  <span className="text-xs text-gray-500">Prêts en cours</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <div className={`w-2.5 h-2.5 rounded-sm ${barColor}`} />
                                <span className="text-xs text-gray-500">Nouvelle mensualité</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
                                <span className="text-xs text-gray-500">Reste à vivre</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">│ 40% max</span>
                          </div>
                        </div>

                        {/* 3 métriques clés en grille ──────────────────────
                            Affiche les 3 composantes de la capacité
                            avec le montant en TND ET le % des revenus
                        ──────────────────────────────────────────────────── */}
                        <div className="grid grid-cols-3 gap-px bg-gray-200 border-t border-gray-200 mt-1">

                          {/* Métrique 1 : Prêts en cours (dettes existantes) */}
                          <div className="bg-white px-4 py-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Prêts en cours</p>
                            <p className="font-bold text-orange-600 text-sm">{formatCurrency(debts)}</p>
                            <p className="text-xs text-gray-400">
                              {income > 0 ? ((debts / income) * 100).toFixed(1) : 0}% revenus
                            </p>
                          </div>

                          {/* Métrique 2 : Nouvelle mensualité (couleur selon seuil) */}
                          <div className={`px-4 py-3 text-center ${bgClass}`}>
                            <p className="text-xs text-gray-500 mb-1">Nouvelle mensualité</p>
                            <p className={`font-bold text-sm ${textClass}`}>
                              {formatCurrency(simulation.monthlyPayment)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {income > 0 ? ((simulation.monthlyPayment / income) * 100).toFixed(1) : 0}% revenus
                            </p>
                          </div>

                          {/* Métrique 3 : Reste à vivre = revenus - toutes les charges */}
                          <div className="bg-white px-4 py-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">Reste à vivre</p>
                            <p className={`font-bold text-sm ${resteAVivre >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.max(resteAVivre, 0))}
                            </p>
                            <p className="text-xs text-gray-400">
                              {income > 0 ? Math.max(((resteAVivre / income) * 100), 0).toFixed(1) : 0}% revenus
                            </p>
                          </div>
                        </div>

                        {/* Message de statut final ──────────────────────────
                            Texte adapté selon le seuil atteint :
                            ≤33% → seuil recommandé
                            ≤40% → seuil max autorisé
                            >40% → dépasse le seuil réglementaire
                        ──────────────────────────────────────────────────── */}
                        <div className={`px-5 py-2.5 text-xs font-medium ${textClass} flex items-center gap-1.5`}>
                          <span>{icon}</span>
                          <span>
                            {statusText} — taux d'endettement {debtRatioDisplay}%
                            {isGood    && ' (seuil recommandé : 33%)'}
                            {isWarning && ' (seuil max autorisé : 40%)'}
                            {isDanger  && ' — dépasse le seuil réglementaire de 40%'}
                          </span>
                        </div>

                      </div>
                    );
                  })()
                )}
              </div>
            </Card>

            {/* ── Récapitulatif final avant soumission ──────────────────────── */}
            {simulation && (
              <Card>
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold">Récapitulatif</h2>
                </div>
                <div className="p-6 space-y-3">
                  {[
                    { label: 'Type',               value: creditType },
                    { label: 'Montant',             value: formatCurrency(amount) },
                    { label: 'Durée',               value: `${duration} mois` },
                    { label: 'Mensualité estimée',  value: formatCurrency(simulation.monthlyPayment) },
                    { label: 'Taux indicatif',      value: `${simulation.annualRate}%` },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-500">{row.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Message d'erreur si la soumission échoue */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Retour
              </Button>
              {/* Bouton de soumission — déclenche onSubmit() */}
              <Button type="submit" loading={isSubmitting} className="flex-1">
                Soumettre la demande
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
