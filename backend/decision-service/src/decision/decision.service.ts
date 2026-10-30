import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDecisionDto } from './dto/create-decision.dto';

@Injectable()
export class DecisionService {
  constructor(private prisma: PrismaService) {}

  // ─── Créer une décision ────────────────────────────────────────────────
  async create(dto: CreateDecisionDto, userId: string, role: string) {
    if (!['DECIDER', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Seul un responsable crédit peut prendre une décision');
    }

    // Vérifier le dossier
    const dossier = await this.prisma.$queryRaw<any[]>`
      SELECT id, status, credit_type, requested_amount, requested_duration, monthly_income
      FROM public.credit_requests WHERE id = ${dto.requestId}
    `;
    if (!dossier?.length) throw new NotFoundException('Dossier introuvable');
    if (dossier[0].status !== 'PENDING_DECISION') {
      throw new BadRequestException(`Le dossier doit être en statut PENDING_DECISION (actuel: ${dossier[0].status})`);
    }

    // Vérifier qu'il n'y a pas déjà une décision
    const existing = await this.prisma.decision.findUnique({ where: { requestId: dto.requestId } });
    if (existing) throw new ConflictException('Une décision existe déjà pour ce dossier');

    // Calcul de la mensualité si approuvé
    let monthlyPayment: number | undefined;
    if (dto.decisionType !== 'REJECTED' && dto.approvedAmount && dto.approvedDuration && dto.interestRate) {
      const r = (dto.interestRate / 100) / 12;
      monthlyPayment = dto.approvedAmount * (r * Math.pow(1 + r, dto.approvedDuration)) / (Math.pow(1 + r, dto.approvedDuration) - 1);
      monthlyPayment = Math.round(monthlyPayment * 100) / 100;
    }

    // Créer la décision
    const decision = await this.prisma.decision.create({
      data: {
        requestId: dto.requestId,
        analysisId: dto.analysisId,
        decidedBy: userId,
        decisionType: dto.decisionType,
        approvedAmount: dto.approvedAmount,
        approvedDuration: dto.approvedDuration,
        interestRate: dto.interestRate,
        monthlyPayment,
        conditions: dto.conditions ?? [],
        refusalReason: dto.refusalReason,
        refusalDetails: dto.refusalDetails,
        signedAt: new Date(),
      },
    });

    // Mettre à jour le statut du dossier
    const newStatus = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      CONDITIONAL: 'CONDITIONALLY_APPROVED',
    }[dto.decisionType];

    await this.prisma.$executeRaw`
      UPDATE public.credit_requests
      SET status = ${newStatus}::public."RequestStatus", updated_at = NOW()
      WHERE id = ${dto.requestId}
    `;

    return decision;
  }

  // ─── Récupérer la décision d'un dossier ───────────────────────────────
  async findByRequest(requestId: string) {
    const decision = await this.prisma.decision.findUnique({ where: { requestId } });
    if (!decision) throw new NotFoundException('Aucune décision pour ce dossier');
    return decision;
  }

  // ─── Lister toutes les décisions (décideur/admin) ─────────────────────
  async findAll(userId: string, role: string) {
    if (!['DECIDER', 'ADMIN'].includes(role)) throw new ForbiddenException('Accès refusé');
    return this.prisma.decision.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // ─── Dossiers en attente de décision ─────────────────────────────────
  async getPendingDossiers() {
    return this.prisma.$queryRaw<any[]>`
      SELECT cr.id, cr.reference, cr.credit_type, cr.requested_amount,
             cr.requested_duration, cr.monthly_income, cr.status, cr.submitted_at,
             a.credit_score, a.risk_level, a.recommendation
      FROM public.credit_requests cr
      LEFT JOIN public.analyses a ON a.request_id = cr.id
      WHERE cr.status = 'PENDING_DECISION'
      ORDER BY cr.submitted_at ASC
    `;
  }

  // ─── Statistiques décisions ───────────────────────────────────────────
  async getStats() {
    const [total, approved, rejected, conditional] = await Promise.all([
      this.prisma.decision.count(),
      this.prisma.decision.count({ where: { decisionType: 'APPROVED' } }),
      this.prisma.decision.count({ where: { decisionType: 'REJECTED' } }),
      this.prisma.decision.count({ where: { decisionType: 'CONDITIONAL' } }),
    ]);
    return { total, approved, rejected, conditional, approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0 };
  }
}
