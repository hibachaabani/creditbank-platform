import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignAnalystDto } from './dto/assign-analyst.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { FilterDossierDto } from './dto/filter-dossier.dto';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class DossierService {
  constructor(private prisma: PrismaService) {}

  // ─── Générer une référence unique ──────────────────────────────────────
  private generateReference(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    return `CR-${year}-${random}`;
  }

  // ─── Calculer le taux d'endettement ─────────────────────────────────────
  private calculateDebtRatio(monthlyIncome: number, existingDebts: number, requestedAmount: number, requestedDuration: number): {
    estimatedMonthly: number;
    debtRatio: number;
    isEligible: boolean;
  } {
    // Taux indicatif pour calcul rapide (sera affiné par l'analyse)
    const rate = 0.04 / 12;
    const estimatedMonthly = requestedAmount * (rate * Math.pow(1 + rate, requestedDuration)) / (Math.pow(1 + rate, requestedDuration) - 1);
    const totalMonthly = existingDebts + estimatedMonthly;
    const debtRatio = (totalMonthly / monthlyIncome) * 100;

    return {
      estimatedMonthly: Math.round(estimatedMonthly * 100) / 100,
      debtRatio: Math.round(debtRatio * 100) / 100,
      isEligible: debtRatio <= 40,
    };
  }

  // ─── Simuler un crédit ──────────────────────────────────────────────────
  simulate(amount: number, duration: number, rate?: number, creditType?: string) {
    // Taux par défaut selon le type de crédit (marché tunisien)
    const defaultRates: Record<string, number> = {
      IMMOBILIER:    8.0,
      AUTO:          10.5,
      CONSOMMATION:  12.0,
      PROFESSIONNEL: 9.5,
      ETUDIANT:      6.0,
    };

    const annualRate = rate ?? (creditType ? (defaultRates[creditType] ?? 9.0) : 9.0);
    const monthlyRate = annualRate / 100 / 12;
    const monthly = amount * (monthlyRate * Math.pow(1 + monthlyRate, duration)) / (Math.pow(1 + monthlyRate, duration) - 1);
    const totalCost = monthly * duration;
    const totalInterest = totalCost - amount;

    return {
      monthlyPayment: Math.round(monthly * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      annualRate,
      duration,
      amount,
      currency: 'TND',
    };
  }

  // ─── Créer un dossier ───────────────────────────────────────────────────
  async create(dto: CreateDossierDto, userId: string, userRole: string) {
    const clientId = userRole === 'CLIENT' ? userId : null;
    const agentId = ['AGENT', 'ADMIN'].includes(userRole) ? userId : null;

    if (!clientId && !agentId) {
      throw new ForbiddenException('Seul un client ou un agent peut créer un dossier');
    }

    const existing = dto.existingDebts ?? 0;
    const { estimatedMonthly, debtRatio, isEligible } = this.calculateDebtRatio(
      dto.monthlyIncome,
      existing,
      dto.requestedAmount,
      dto.requestedDuration,
    );

    const dossier = await this.prisma.creditRequest.create({
      data: {
        reference: this.generateReference(),
        clientId: clientId ?? userId,
        agentId,
        agencyId: dto.agencyId,
        creditType: dto.creditType,
        requestedAmount: dto.requestedAmount,
        requestedDuration: dto.requestedDuration,
        monthlyIncome: dto.monthlyIncome,
        existingDebts: existing,
        purpose: dto.purpose,
        status: 'DRAFT',
      },
    });

    await this.prisma.statusHistory.create({
      data: {
        requestId: dossier.id,
        newStatus: 'DRAFT',
        changedBy: userId,
        comment: 'Dossier créé',
      },
    });

    return {
      ...dossier,
      simulation: { estimatedMonthly, debtRatio, isEligible },
    };
  }

  // ─── Soumettre un dossier ───────────────────────────────────────────────
  async submit(id: string, userId: string) {
    const dossier = await this.findOneOrFail(id);

    if (dossier.clientId !== userId && dossier.agentId !== userId) {
      throw new ForbiddenException('Accès refusé');
    }

    if (dossier.status !== 'DRAFT') {
      throw new BadRequestException('Seul un dossier en brouillon peut être soumis');
    }

    return this.changeStatus(id, 'SUBMITTED', userId, 'Dossier soumis pour traitement');
  }

  // ─── Lister les dossiers ────────────────────────────────────────────────
  async findAll(filter: FilterDossierDto, userId: string, userRole: string) {
    const where: any = {};

    // Filtrage selon le rôle
    if (userRole === 'CLIENT') where.clientId = userId;
    // L'agent voit tous les dossiers SUBMITTED, UNDER_REVIEW ou les siens
    if (userRole === 'AGENT') {
      where.OR = [
        { agentId: userId },
        { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      ];
    }
    if (userRole === 'ANALYST') where.status = { in: ['SUBMITTED', 'UNDER_REVIEW', 'IN_ANALYSIS', 'PENDING_DECISION'] };

    if (filter.status) where.status = filter.status;
    if (filter.creditType) where.creditType = filter.creditType;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.creditRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Détail d'un dossier ────────────────────────────────────────────────
  async findOne(id: string, userId: string, userRole: string) {
    const dossier = await this.findOneOrFail(id);

    if (userRole === 'CLIENT' && dossier.clientId !== userId) {
      throw new ForbiddenException('Accès refusé');
    }

    return dossier;
  }

  // ─── Historique des statuts ─────────────────────────────────────────────
  async getHistory(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.statusHistory.findMany({
      where: { requestId: id },
      orderBy: { changedAt: 'asc' },
    });
  }

  // ─── Changer le statut ──────────────────────────────────────────────────
  async updateStatus(id: string, dto: UpdateStatusDto, userId: string, userRole: string) {
    const dossier = await this.findOneOrFail(id);

    // Vérification des permissions par rôle
    const allowedTransitions: Record<string, RequestStatus[]> = {
      AGENT:   ['SUBMITTED', 'UNDER_REVIEW', 'IN_ANALYSIS'],
      ANALYST: ['IN_ANALYSIS', 'PENDING_DECISION'],
      DECIDER: ['APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED'],
      ADMIN:   Object.values(RequestStatus) as RequestStatus[],
    };

    const allowed = allowedTransitions[userRole] ?? [];
    if (!allowed.includes(dto.status) && userRole !== 'ADMIN') {
      throw new ForbiddenException(`Vous ne pouvez pas mettre le statut à ${dto.status}`);
    }

    return this.changeStatus(id, dto.status, userId, dto.comment);
  }

  // ─── Affecter un analyste ───────────────────────────────────────────────
  async assignAnalyst(id: string, dto: AssignAnalystDto, userId: string) {
    const dossier = await this.findOneOrFail(id);

    const updated = await this.prisma.creditRequest.update({
      where: { id },
      data: { agentId: dto.analystId, status: 'IN_ANALYSIS' },
    });

    await this.prisma.statusHistory.create({
      data: {
        requestId: id,
        oldStatus: dossier.status,
        newStatus: 'IN_ANALYSIS',
        changedBy: userId,
        comment: `Dossier affecté à l'analyste ${dto.analystId}`,
      },
    });

    return updated;
  }

  // ─── Messagerie ─────────────────────────────────────────────────────────
  async sendMessage(id: string, dto: SendMessageDto, userId: string) {
    await this.findOneOrFail(id);
    return this.prisma.dossierMessage.create({
      data: { requestId: id, senderId: userId, content: dto.content },
    });
  }

  async getMessages(id: string) {
    await this.findOneOrFail(id);
    return this.prisma.dossierMessage.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Stats globales ─────────────────────────────────────────────────────
  async getStats(userRole: string, userId: string) {
    // La condition doit être cohérente avec findAll()
    let where: any = {};

    if (userRole === 'CLIENT') {
      where = { clientId: userId };
    } else if (userRole === 'AGENT') {
      // L'agent voit les dossiers qu'il a créés OU tous les dossiers soumis/en cours
      where = {
        OR: [
          { agentId: userId },
          { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'IN_ANALYSIS', 'PENDING_DECISION', 'APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED'] } },
        ],
      };
    } else if (userRole === 'ANALYST') {
      where = {
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'IN_ANALYSIS', 'PENDING_DECISION'] },
      };
    }
    // DECIDER et ADMIN → pas de filtre (tous les dossiers)

    const byStatus = await this.prisma.creditRequest.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const byType = await this.prisma.creditRequest.groupBy({
      by: ['creditType'],
      where,
      _count: true,
    });

    const total = await this.prisma.creditRequest.count({ where });

    return { total, byStatus, byType };
  }

  // ─── Utilitaire privé ───────────────────────────────────────────────────
  private async findOneOrFail(id: string) {
    const dossier = await this.prisma.creditRequest.findUnique({ where: { id } });
    if (!dossier) throw new NotFoundException(`Dossier ${id} introuvable`);
    return dossier;
  }

  private async changeStatus(id: string, newStatus: RequestStatus, userId: string, comment?: string) {
    const current = await this.findOneOrFail(id);
    const data: any = { status: newStatus };
    if (newStatus === 'SUBMITTED') data.submittedAt = new Date();
    if (['CLOSED', 'REJECTED', 'DEFAULTED'].includes(newStatus)) data.closedAt = new Date();

    const [updated] = await Promise.all([
      this.prisma.creditRequest.update({ where: { id }, data }),
      this.prisma.statusHistory.create({
        data: { requestId: id, oldStatus: current.status, newStatus, changedBy: userId, comment },
      }),
    ]);

    return updated;
  }
}
