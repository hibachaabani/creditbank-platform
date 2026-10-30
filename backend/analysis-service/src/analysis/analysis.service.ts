import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import { calculateCreditScore, calculateMonthlyPayment, ScoringInput, ScoringResult } from './scoring.engine';
import { MlScoringService } from './ml-scoring.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private prisma: PrismaService,
    private mlScoring: MlScoringService,
  ) {}

  /**
   * Tente d'abord le service ML Python.
   * Si indisponible ou erreur → fallback sur les règles locales.
   */
  private async computeScore(input: ScoringInput): Promise<ScoringResult & { modelUsed: 'ML' | 'RULES' }> {
    const mlResult = await this.mlScoring.predict(input);
    if (mlResult) {
      return { ...mlResult, modelUsed: 'ML' };
    }
    this.logger.warn('Fallback sur le moteur de règles local');
    return { ...calculateCreditScore(input), modelUsed: 'RULES' };
  }

  // ─── Lancer l'analyse automatique ─────────────────────────────────────
  async create(dto: CreateAnalysisDto, analystId: string) {
    // Vérifier qu'il n'y a pas déjà une analyse
    const existing = await this.prisma.analysis.findUnique({ where: { requestId: dto.requestId } });
    if (existing) throw new ConflictException('Une analyse existe déjà pour ce dossier');

    // Récupérer les données du dossier depuis la base partagée
    const dossierData = await this.prisma.$queryRaw<any[]>`
      SELECT id, credit_type, requested_amount, requested_duration, monthly_income, existing_debts, status
      FROM public.credit_requests
      WHERE id = ${dto.requestId}
    `;

    if (!dossierData || dossierData.length === 0) {
      throw new NotFoundException(`Dossier ${dto.requestId} introuvable`);
    }

    const dossier = dossierData[0];

    const monthlyIncome = parseFloat(dossier.monthly_income);
    const existingDebts = parseFloat(dossier.existing_debts);
    const requestedAmount = parseFloat(dossier.requested_amount);
    const requestedDuration = dossier.requested_duration;
    const estimatedMonthly = calculateMonthlyPayment(requestedAmount, requestedDuration, undefined, dossier.credit_type);

    // ─── Calcul du score (ML → fallback règles) ─────────────────────────
    const scoringInput: ScoringInput = {
      monthlyIncome,
      existingDebts,
      estimatedMonthly,
      requestedAmount,
      requestedDuration,
      creditType: dossier.credit_type,
    };
    const scoring = await this.computeScore(scoringInput);
    this.logger.log(`Score calculé via ${scoring.modelUsed}: ${scoring.score}/1000`);

    // ─── Générer le rapport automatique ────────────────────────────────
    const narrativeReport = this.generateNarrativeReport(dossier, scoring, estimatedMonthly);

    // ─── Sauvegarder l'analyse ──────────────────────────────────────────
    const analysis = await this.prisma.analysis.create({
      data: {
        requestId: dto.requestId,
        analystId,
        monthlyIncome,
        existingDebts,
        estimatedMonthly,
        debtRatio: scoring.debtRatio,
        repaymentCapacity: scoring.repaymentCapacity,
        netIncomeAfter: scoring.netIncomeAfter,
        creditScore: scoring.score,
        riskLevel: scoring.riskLevel,
        recommendation: scoring.recommendation,
        narrativeReport,
        fraudAlert: false,
        aiExplanation: JSON.parse(JSON.stringify({ factors: scoring.factors, modelUsed: scoring.modelUsed })),
      },
    });

    return { ...analysis, scoring };
  }

  // ─── Récupérer l'analyse d'un dossier ─────────────────────────────────
  async findByRequest(requestId: string) {
    const analysis = await this.prisma.analysis.findUnique({ where: { requestId } });
    if (!analysis) throw new NotFoundException('Aucune analyse trouvée pour ce dossier');
    return analysis;
  }

  // ─── Mettre à jour le rapport (analyste) ──────────────────────────────
  async update(requestId: string, dto: UpdateAnalysisDto, analystId: string, role: string) {
    if (!['ANALYST', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Seul un analyste peut modifier une analyse');
    }

    const existing = await this.prisma.analysis.findUnique({ where: { requestId } });
    if (!existing) throw new NotFoundException('Analyse introuvable');

    return this.prisma.analysis.update({
      where: { requestId },
      data: {
        narrativeReport: dto.narrativeReport,
        recommendation: dto.recommendation,
        recommendationNotes: dto.recommendationNotes,
      },
    });
  }

  // ─── Soumettre l'analyse (finalisée) ──────────────────────────────────
  async submit(requestId: string, analystId: string, role: string) {
    if (!['ANALYST', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Seul un analyste peut soumettre une analyse');
    }

    const existing = await this.prisma.analysis.findUnique({ where: { requestId } });
    if (!existing) throw new NotFoundException('Analyse introuvable');
    if (!existing.recommendation) throw new ForbiddenException('Vous devez définir une recommandation avant de soumettre');

    const analysis = await this.prisma.analysis.update({
      where: { requestId },
      data: { submittedAt: new Date() },
    });

    // Mettre à jour le statut du dossier → PENDING_DECISION
    await this.prisma.$executeRaw`
      UPDATE public.credit_requests
      SET status = 'PENDING_DECISION', updated_at = NOW()
      WHERE id = ${requestId}
    `;

    return analysis;
  }

  // ─── Score seul (sans créer l'analyse) ────────────────────────────────
  async getScore(requestId: string) {
    const dossierData = await this.prisma.$queryRaw<any[]>`
      SELECT credit_type, requested_amount, requested_duration, monthly_income, existing_debts
      FROM public.credit_requests WHERE id = ${requestId}
    `;
    if (!dossierData?.length) throw new NotFoundException('Dossier introuvable');

    const d = dossierData[0];
    const estimatedMonthly = calculateMonthlyPayment(parseFloat(d.requested_amount), d.requested_duration, undefined, d.credit_type);

    const input: ScoringInput = {
      monthlyIncome: parseFloat(d.monthly_income),
      existingDebts: parseFloat(d.existing_debts),
      estimatedMonthly,
      requestedAmount: parseFloat(d.requested_amount),
      requestedDuration: d.requested_duration,
      creditType: d.credit_type,
    };

    return this.computeScore(input);
  }

  // ─── Générateur de rapport narratif ───────────────────────────────────
  private generateNarrativeReport(dossier: any, scoring: any, estimatedMonthly: number): string {
    const riskLabels = { LOW: 'faible', MEDIUM: 'modéré', HIGH: 'élevé', VERY_HIGH: 'très élevé' };
    const recLabels = { FAVORABLE: 'favorable', UNFAVORABLE: 'défavorable', CONDITIONAL: 'favorable sous conditions' };

    return `RAPPORT D'ANALYSE CRÉDIT — ${new Date().toLocaleDateString('fr-FR')}

RÉSUMÉ EXÉCUTIF
───────────────
Type de crédit : ${dossier.credit_type}
Montant demandé : ${parseFloat(dossier.requested_amount).toLocaleString('fr-FR')} MAD
Durée : ${dossier.requested_duration} mois
Mensualité estimée : ${estimatedMonthly.toFixed(2)} MAD

ANALYSE FINANCIÈRE
──────────────────
Revenus mensuels nets : ${parseFloat(dossier.monthly_income).toLocaleString('fr-FR')} MAD
Charges existantes : ${parseFloat(dossier.existing_debts).toLocaleString('fr-FR')} MAD/mois
Taux d'endettement : ${scoring.debtRatio}%
Capacité de remboursement restante : ${scoring.repaymentCapacity.toLocaleString('fr-FR')} MAD/mois

SCORE DE RISQUE
───────────────
Score IA : ${scoring.score}/1000
Niveau de risque : ${riskLabels[scoring.riskLevel as keyof typeof riskLabels] ?? scoring.riskLevel}

FACTEURS DÉTERMINANTS
─────────────────────
${scoring.factors.map((f: any) => `${f.impact === 'POSITIVE' ? '✅' : f.impact === 'NEGATIVE' ? '❌' : '➡️'} ${f.name} : ${f.description}`).join('\n')}

RECOMMANDATION
──────────────
Avis de l'analyste : ${recLabels[scoring.recommendation as keyof typeof recLabels] ?? scoring.recommendation}
${scoring.recommendation === 'CONDITIONAL' ? '\nConditions suggérées : Apport personnel supplémentaire, garantie additionnelle, ou réduction du montant demandé.' : ''}
`;
  }
}
