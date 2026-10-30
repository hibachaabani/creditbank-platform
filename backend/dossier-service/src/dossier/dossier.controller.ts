import {
  Controller, Get, Post, Body, Param, Patch, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DossierService } from './dossier.service';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignAnalystDto } from './dto/assign-analyst.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { FilterDossierDto } from './dto/filter-dossier.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Dossiers')
@ApiBearerAuth()
@Controller('dossiers')
export class DossierController {
  constructor(private readonly dossierService: DossierService) {}

  // ─── Simulateur (PUBLIC) ─────────────────────────────────────────────────
  @Get('simulate')
  @ApiOperation({ summary: 'Simuler un crédit (mensualité, coût total)' })
  simulate(
    @Query('amount') amount: string,
    @Query('duration') duration: string,
    @Query('rate') rate?: string,
    @Query('creditType') creditType?: string,
  ) {
    return this.dossierService.simulate(+amount, +duration, rate ? +rate : undefined, creditType);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Statistiques des dossiers' })
  getStats(@CurrentUser() user: any) {
    return this.dossierService.getStats(user.role, user.id);
  }

  // ─── Créer un dossier ────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Créer une nouvelle demande de crédit' })
  create(@Body() dto: CreateDossierDto, @CurrentUser() user: any) {
    return this.dossierService.create(dto, user.id, user.role);
  }

  // ─── Lister les dossiers ─────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Lister les dossiers (filtrés par rôle)' })
  findAll(@Query() filter: FilterDossierDto, @CurrentUser() user: any) {
    return this.dossierService.findAll(filter, user.id, user.role);
  }

  // ─── Détail d'un dossier ─────────────────────────────────────────────────
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Détail d\'un dossier' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.dossierService.findOne(id, user.id, user.role);
  }

  // ─── Soumettre un dossier ────────────────────────────────────────────────
  @Patch(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Soumettre un dossier pour traitement' })
  submit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.dossierService.submit(id, user.id);
  }

  // ─── Changer le statut ───────────────────────────────────────────────────
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'ANALYST', 'DECIDER', 'ADMIN')
  @ApiOperation({ summary: 'Mettre à jour le statut du dossier' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: any) {
    return this.dossierService.updateStatus(id, dto, user.id, user.role);
  }

  // ─── Affecter un analyste ────────────────────────────────────────────────
  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Affecter un analyste au dossier' })
  assignAnalyst(@Param('id') id: string, @Body() dto: AssignAnalystDto, @CurrentUser() user: any) {
    return this.dossierService.assignAnalyst(id, dto, user.id);
  }

  // ─── Historique des statuts ──────────────────────────────────────────────
  @Get(':id/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Historique des changements de statut' })
  getHistory(@Param('id') id: string) {
    return this.dossierService.getHistory(id);
  }

  // ─── Messagerie ──────────────────────────────────────────────────────────
  @Post(':id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Envoyer un message lié au dossier' })
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto, @CurrentUser() user: any) {
    return this.dossierService.sendMessage(id, dto, user.id);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Récupérer les messages du dossier' })
  getMessages(@Param('id') id: string) {
    return this.dossierService.getMessages(id);
  }
}
