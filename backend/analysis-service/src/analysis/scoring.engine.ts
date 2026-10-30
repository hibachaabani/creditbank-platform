/**
 * ============================================================
 * MOTEUR DE SCORING DE CRÉDIT
 * ============================================================
 * Ce fichier calcule un score de risque entre 0 et 1000
 * pour chaque demande de crédit.
 *
 * Principe : comme un bulletin de notes bancaire.
 *   - Score de base : 500 (neutre)
 *   - On AJOUTE des points si le client est fiable
 *   - On RETIRE des points si le client présente des risques
 *   - Score final entre 0 (très risqué) et 1000 (excellent)
 *
 * 6 critères sont évalués (inspirés des standards bancaires) :
 *   1. Taux d'endettement        (poids fort : ±300 pts)
 *   2. Capacité de remboursement (poids moyen : ±100 pts)
 *   3. Durée du crédit           (poids moyen : ±80 pts)
 *   4. Montant vs revenus        (poids moyen : ±80 pts)
 *   5. Type de crédit            (poids faible : ±50 pts)
 *   6. Dettes existantes         (poids faible : ±80 pts)
 * ============================================================
 */

// ─── Données d'entrée pour le calcul du score ────────────────────────────────
export interface ScoringInput {
  monthlyIncome:     number;  // Revenus mensuels nets du client (TND)
  existingDebts:     number;  // Mensualités d'autres crédits en cours (TND)
  estimatedMonthly:  number;  // Mensualité estimée du crédit demandé (TND)
  requestedAmount:   number;  // Montant total demandé (TND)
  requestedDuration: number;  // Durée en mois
  creditType:        string;  // IMMOBILIER | AUTO | CONSOMMATION | PROFESSIONNEL | ETUDIANT
}

// ─── Résultat complet retourné après calcul ───────────────────────────────────
export interface ScoringResult {
  score:              number;                           // Score final 0-1000
  riskLevel:          'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'; // Niveau de risque
  debtRatio:          number;  // Taux d'endettement en %
  repaymentCapacity:  number;  // Argent disponible après paiement (TND/mois)
  netIncomeAfter:     number;  // Revenu restant après toutes les charges (TND)
  factors:            ScoringFactor[];  // Liste des facteurs expliquant le score
  recommendation:     'FAVORABLE' | 'UNFAVORABLE' | 'CONDITIONAL'; // Décision
}

// ─── Un facteur explique pourquoi le score a augmenté ou baissé ──────────────
export interface ScoringFactor {
  name:        string;                            // Nom du critère
  impact:      'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; // Effet sur le score
  weight:      number;                            // Points ajoutés/retirés
  description: string;                            // Explication lisible
}

// ─── Fonction principale de calcul du score ──────────────────────────────────
export function calculateCreditScore(input: ScoringInput): ScoringResult {
  const {
    monthlyIncome,
    existingDebts,
    estimatedMonthly,
    requestedAmount,
    requestedDuration,
    creditType,
  } = input;

  // Score de départ neutre (ni bon ni mauvais)
  let score = 500;

  // Tableau qui va stocker l'explication de chaque critère
  const factors: ScoringFactor[] = [];

  // ════════════════════════════════════════════════════════════════════
  // CRITÈRE 1 — TAUX D'ENDETTEMENT
  // ════════════════════════════════════════════════════════════════════
  // Formule : (dettes existantes + nouvelle mensualité) / revenus × 100
  // Exemple : (200 + 300) / 5000 × 100 = 10%
  // Seuil réglementaire tunisien : max 40%
  // ────────────────────────────────────────────────────────────────────
  const totalMonthly      = existingDebts + estimatedMonthly; // total charges mensuelles
  const debtRatio         = monthlyIncome > 0
    ? (totalMonthly / monthlyIncome) * 100
    : 100; // si pas de revenu → taux max par sécurité
  const repaymentCapacity = monthlyIncome - totalMonthly; // argent restant après charges
  const netIncomeAfter    = repaymentCapacity;

  if (debtRatio <= 20) {
    // Très faible endettement → excellent profil → +200 pts
    score += 200;
    factors.push({ name: 'Taux d\'endettement', impact: 'POSITIVE', weight: 200,
      description: `Excellent : ${debtRatio.toFixed(1)}% (≤ 20%)` });

  } else if (debtRatio <= 33) {
    // Endettement normal → bon profil → +100 pts
    score += 100;
    factors.push({ name: 'Taux d\'endettement', impact: 'POSITIVE', weight: 100,
      description: `Bon : ${debtRatio.toFixed(1)}% (≤ 33%)` });

  } else if (debtRatio <= 40) {
    // Dans la limite réglementaire mais sans bonus → 0 pt
    score += 0;
    factors.push({ name: 'Taux d\'endettement', impact: 'NEUTRAL', weight: 0,
      description: `Acceptable : ${debtRatio.toFixed(1)}% (≤ 40%)` });

  } else if (debtRatio <= 50) {
    // Au-dessus du seuil → risque → -150 pts
    score -= 150;
    factors.push({ name: 'Taux d\'endettement', impact: 'NEGATIVE', weight: -150,
      description: `Élevé : ${debtRatio.toFixed(1)}% (> 40%)` });

  } else {
    // Très au-dessus → risque élevé → -300 pts
    score -= 300;
    factors.push({ name: 'Taux d\'endettement', impact: 'NEGATIVE', weight: -300,
      description: `Très élevé : ${debtRatio.toFixed(1)}% (> 50%)` });
  }

  // ════════════════════════════════════════════════════════════════════
  // CRITÈRE 2 — CAPACITÉ DE REMBOURSEMENT
  // ════════════════════════════════════════════════════════════════════
  // Ratio : revenus / mensualité demandée
  // Mesure combien de fois les revenus couvrent la mensualité
  // Exemple : revenu 5000 / mensualité 200 = ratio 25 → très confortable
  // ────────────────────────────────────────────────────────────────────
  const coverageRatio = estimatedMonthly > 0
    ? monthlyIncome / estimatedMonthly
    : 0;

  if (coverageRatio >= 5) {
    // Revenus = 5× la mensualité ou plus → très confortable → +100 pts
    score += 100;
    factors.push({ name: 'Capacité de remboursement', impact: 'POSITIVE', weight: 100,
      description: `Très forte capacité (revenus x${coverageRatio.toFixed(1)} la mensualité)` });

  } else if (coverageRatio >= 3) {
    // Revenus = 3× la mensualité → correct → +50 pts
    score += 50;
    factors.push({ name: 'Capacité de remboursement', impact: 'POSITIVE', weight: 50,
      description: `Bonne capacité (revenus x${coverageRatio.toFixed(1)} la mensualité)` });

  } else if (coverageRatio < 2) {
    // Revenus à peine le double de la mensualité → trop juste → -100 pts
    score -= 100;
    factors.push({ name: 'Capacité de remboursement', impact: 'NEGATIVE', weight: -100,
      description: `Capacité limitée (revenus x${coverageRatio.toFixed(1)} la mensualité)` });
  }
  // Entre 2× et 3× : neutre, aucun point ajouté ni retiré

  // ════════════════════════════════════════════════════════════════════
  // CRITÈRE 3 — DURÉE DU CRÉDIT
  // ════════════════════════════════════════════════════════════════════
  // Une durée courte = moins de risque pour la banque
  // (le client rembourse vite, moins de chances d'impayé)
  // ────────────────────────────────────────────────────────────────────
  if (requestedDuration <= 60) {
    // ≤ 5 ans → durée courte → +80 pts
    score += 80;
    factors.push({ name: 'Durée du crédit', impact: 'POSITIVE', weight: 80,
      description: `Courte durée : ${requestedDuration} mois` });

  } else if (requestedDuration <= 120) {
    // ≤ 10 ans → durée modérée → +40 pts
    score += 40;
    factors.push({ name: 'Durée du crédit', impact: 'POSITIVE', weight: 40,
      description: `Durée modérée : ${requestedDuration} mois` });

  } else if (requestedDuration > 240) {
    // > 20 ans → durée très longue → risque → -60 pts
    score -= 60;
    factors.push({ name: 'Durée du crédit', impact: 'NEGATIVE', weight: -60,
      description: `Longue durée : ${requestedDuration} mois` });
  }
  // Entre 10 et 20 ans : neutre

  // ════════════════════════════════════════════════════════════════════
  // CRITÈRE 4 — MONTANT DEMANDÉ vs REVENUS ANNUELS
  // ════════════════════════════════════════════════════════════════════
  // Formule : montant / (revenus × 12)
  // Exemple : 4000 / (5000 × 12) = 4000 / 60000 = 0.07 → très raisonnable
  // ────────────────────────────────────────────────────────────────────
  const annualIncome      = monthlyIncome * 12; // revenus annuels
  const loanToIncomeRatio = annualIncome > 0
    ? requestedAmount / annualIncome
    : 99; // pas de revenu → ratio max par sécurité

  if (loanToIncomeRatio <= 2) {
    // Montant ≤ 2 années de revenus → raisonnable → +80 pts
    score += 80;
    factors.push({ name: 'Montant vs revenus', impact: 'POSITIVE', weight: 80,
      description: `Montant raisonnable (${loanToIncomeRatio.toFixed(1)}x revenus annuels)` });

  } else if (loanToIncomeRatio <= 4) {
    // Montant entre 2 et 4 années de revenus → acceptable → +20 pts
    score += 20;
    factors.push({ name: 'Montant vs revenus', impact: 'POSITIVE', weight: 20,
      description: `Montant acceptable (${loanToIncomeRatio.toFixed(1)}x revenus annuels)` });

  } else if (loanToIncomeRatio > 6) {
    // Montant > 6 années de revenus → trop élevé → -120 pts
    score -= 120;
    factors.push({ name: 'Montant vs revenus', impact: 'NEGATIVE', weight: -120,
      description: `Montant très élevé (${loanToIncomeRatio.toFixed(1)}x revenus annuels)` });
  }
  // Entre 4 et 6 : neutre

  // ════════════════════════════════════════════════════════════════════
  // CRITÈRE 5 — TYPE DE CRÉDIT
  // ════════════════════════════════════════════════════════════════════
  // Immobilier = garanti par le bien → moins risqué pour la banque
  // Consommation = aucune garantie → plus risqué
  // ────────────────────────────────────────────────────────────────────
  if (creditType === 'IMMOBILIER') {
    // Le bien immobilier sert de garantie → +50 pts
    score += 50;
    factors.push({ name: 'Type de crédit', impact: 'POSITIVE', weight: 50,
      description: 'Crédit immobilier avec garantie réelle' });

  } else if (creditType === 'CONSOMMATION') {
    // Pas de garantie → risque plus élevé → -30 pts
    score -= 30;
    factors.push({ name: 'Type de crédit', impact: 'NEGATIVE', weight: -30,
      description: 'Crédit à la consommation sans garantie' });
  }
  // AUTO, PROFESSIONNEL, ETUDIANT : neutre (ni bonus ni malus)

  // ════════════════════════════════════════════════════════════════════
  // CRITÈRE 6 — DETTES EXISTANTES
  // ════════════════════════════════════════════════════════════════════
  // Aucune dette = profil propre → bonus
  // Dettes importantes = client déjà chargé → pénalité
  // ────────────────────────────────────────────────────────────────────
  if (existingDebts === 0) {
    // Aucun crédit en cours → excellent signe → +60 pts
    score += 60;
    factors.push({ name: 'Engagements existants', impact: 'POSITIVE', weight: 60,
      description: 'Aucune dette en cours' });

  } else if (existingDebts > monthlyIncome * 0.2) {
    // Les dettes existantes dépassent 20% des revenus → trop chargé → -80 pts
    score -= 80;
    factors.push({ name: 'Engagements existants', impact: 'NEGATIVE', weight: -80,
      description: `Dettes existantes importantes : ${existingDebts} TND/mois` });
  }
  // Dettes modérées (≤ 20% revenus) : neutre

  // ════════════════════════════════════════════════════════════════════
  // NORMALISATION DU SCORE
  // ════════════════════════════════════════════════════════════════════
  // Le score ne peut pas dépasser 1000 ni descendre sous 0
  // Math.max(0, ...) empêche les valeurs négatives
  // Math.min(1000, ...) empêche les valeurs supérieures à 1000
  // ────────────────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(1000, score));

  // ════════════════════════════════════════════════════════════════════
  // DÉDUCTION DU NIVEAU DE RISQUE ET DE LA RECOMMANDATION
  // ════════════════════════════════════════════════════════════════════
  // Le score final est traduit en niveau de risque et en décision
  // ────────────────────────────────────────────────────────────────────
  let riskLevel:      'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  let recommendation: 'FAVORABLE' | 'UNFAVORABLE' | 'CONDITIONAL';

  if (score >= 700) {
    riskLevel      = 'LOW';       // Risque faible  → accord recommandé
    recommendation = 'FAVORABLE';
  } else if (score >= 550) {
    riskLevel      = 'MEDIUM';    // Risque modéré  → accord avec conditions
    recommendation = 'CONDITIONAL';
  } else if (score >= 400) {
    riskLevel      = 'HIGH';      // Risque élevé   → accord avec garanties
    recommendation = 'CONDITIONAL';
  } else {
    riskLevel      = 'VERY_HIGH'; // Risque très élevé → refus recommandé
    recommendation = 'UNFAVORABLE';
  }

  // Règle absolue : si taux d'endettement > 50% → refus automatique
  // même si le score dépasse 700 (ex: revenus très élevés mais très endetté)
  if (debtRatio > 50) recommendation = 'UNFAVORABLE';

  // ─── Retourner le résultat complet ────────────────────────────────────
  return {
    score,
    riskLevel,
    debtRatio:           Math.round(debtRatio * 100) / 100,          // arrondi 2 décimales
    repaymentCapacity:   Math.round(repaymentCapacity * 100) / 100,  // arrondi 2 décimales
    netIncomeAfter:      Math.round(netIncomeAfter * 100) / 100,     // arrondi 2 décimales
    factors,      // liste des 6 critères avec leur impact
    recommendation,
  };
}

// ════════════════════════════════════════════════════════════════════
// FONCTION UTILITAIRE — CALCUL DE LA MENSUALITÉ
// ════════════════════════════════════════════════════════════════════
// Formule des annuités constantes (standard bancaire) :
//   M = C × [r × (1+r)^n] / [(1+r)^n - 1]
//   C = capital, r = taux mensuel, n = durée en mois
// ────────────────────────────────────────────────────────────────────
export function calculateMonthlyPayment(
  amount: number,
  duration: number,
  annualRate?: number,
  creditType?: string,
): number {
  // Taux par défaut selon le type de crédit (marché tunisien)
  const defaultRates: Record<string, number> = {
    IMMOBILIER:    8.0,
    AUTO:          10.5,
    CONSOMMATION:  12.0,
    PROFESSIONNEL: 9.5,
    ETUDIANT:      6.0,
  };

  // Priorité : taux explicite > taux du type de crédit > taux par défaut 9%
  const rate = annualRate ?? (creditType ? (defaultRates[creditType] ?? 9.0) : 9.0);

  // Conversion du taux annuel en taux mensuel décimal
  const r = (rate / 100) / 12;

  // Cas particulier : taux = 0% → mensualité = capital / durée (division simple)
  if (r === 0) return amount / duration;

  // Application de la formule des annuités constantes
  return amount * (r * Math.pow(1 + r, duration)) / (Math.pow(1 + r, duration) - 1);
}
